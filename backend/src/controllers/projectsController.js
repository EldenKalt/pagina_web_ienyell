const {
  ProjectStatus,
  Role,
  TaskColumn,
  TaskPriority
} = require("@prisma/client");
const prisma = require("../lib/prisma");

const PROJECT_STATUSES = Object.values(ProjectStatus);
const TASK_COLUMNS = Object.values(TaskColumn);
const DEFAULT_ESTIMATED_HOURS = 8;
const ETA_MAX_DAYS = 730;
const DAY_KEYS = [
  "domingo",
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado"
];

function parsePositiveInt(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseNonNegativeInt(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function parseEstimatedHours(value) {
  if (value === null || value === "" || value === undefined) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function normalizeText(value) {
  return String(value || "").trim();
}

function includeForProject(userRole) {
  return {
    client: userRole === Role.ADMIN
      ? {
          select: {
            id: true,
            name: true,
            company: true
          }
        }
      : false,
    _count: {
      select: {
        tasks: true
      }
    }
  };
}

function emitProjectEvent(project, eventName, payload = {}) {
  const { io } = require("../index");
  if (!io || !project) {
    return;
  }

  const eventPayload = {
    projectId: project.id,
    clientId: project.clientId,
    ...payload
  };

  io.to(`project-${project.id}`)
    .to("role-ADMIN")
    .to(`user-${project.clientId}`)
    .emit(eventName, eventPayload);
}

function emitQueueChanged() {
  const { io } = require("../index");
  if (io) {
    io.to("role-ADMIN").emit("project:queue-changed", {});
    io.to("role-CLIENT").emit("project:queue-changed", {});
  }
}

async function findProjectForUser(projectId, user, include = {}) {
  const roleFilter = user.role === Role.CLIENT
    ? { clientId: user.id }
    : user.role === Role.COLABORADOR
      ? { tasks: { some: { assigneeId: user.id } } }
      : {};
  return prisma.project.findFirst({
    where: { id: projectId, ...roleFilter },
    include
  });
}

async function normalizeQueue(tx) {
  const queued = await tx.project.findMany({
    where: { status: ProjectStatus.QUEUED },
    orderBy: [
      { priority: "asc" },
      { createdAt: "asc" },
      { id: "asc" }
    ],
    select: { id: true }
  });

  await Promise.all(
    queued.map(({ id }, index) =>
      tx.project.update({
        where: { id },
        data: { priority: index }
      })
    )
  );
}

async function reorderQueue(tx, projectId, targetPriority) {
  const queued = await tx.project.findMany({
    where: {
      status: ProjectStatus.QUEUED,
      id: { not: projectId }
    },
    orderBy: [
      { priority: "asc" },
      { createdAt: "asc" },
      { id: "asc" }
    ],
    select: { id: true }
  });

  const insertionIndex = Math.min(Math.max(targetPriority, 0), queued.length);
  queued.splice(insertionIndex, 0, { id: projectId });

  await Promise.all(
    queued.map(({ id }, index) =>
      tx.project.update({
        where: { id },
        data: { priority: index }
      })
    )
  );
}

async function normalizeTaskColumn(tx, projectId, column) {
  const tasks = await tx.projectTask.findMany({
    where: { projectId, column },
    orderBy: [
      { order: "asc" },
      { createdAt: "asc" },
      { id: "asc" }
    ],
    select: { id: true }
  });

  await Promise.all(
    tasks.map(({ id }, index) =>
      tx.projectTask.update({
        where: { id },
        data: { order: index }
      })
    )
  );
}

async function moveTask(tx, task, targetColumn, targetOrder) {
  const sourceColumn = task.column;
  const sourceTasks = await tx.projectTask.findMany({
    where: {
      projectId: task.projectId,
      column: sourceColumn,
      id: { not: task.id }
    },
    orderBy: [
      { order: "asc" },
      { createdAt: "asc" },
      { id: "asc" }
    ],
    select: { id: true }
  });

  if (sourceColumn === targetColumn) {
    const insertionIndex = Math.min(Math.max(targetOrder, 0), sourceTasks.length);
    sourceTasks.splice(insertionIndex, 0, { id: task.id });
    await Promise.all(
      sourceTasks.map(({ id }, index) =>
        tx.projectTask.update({
          where: { id },
          data: {
            column: targetColumn,
            order: index
          }
        })
      )
    );
    return;
  }

  const targetTasks = await tx.projectTask.findMany({
    where: {
      projectId: task.projectId,
      column: targetColumn
    },
    orderBy: [
      { order: "asc" },
      { createdAt: "asc" },
      { id: "asc" }
    ],
    select: { id: true }
  });
  const insertionIndex = Math.min(Math.max(targetOrder, 0), targetTasks.length);
  targetTasks.splice(insertionIndex, 0, { id: task.id });

  await Promise.all([
    ...sourceTasks.map(({ id }, index) =>
      tx.projectTask.update({
        where: { id },
        data: { order: index }
      })
    ),
    ...targetTasks.map(({ id }, index) =>
      tx.projectTask.update({
        where: { id },
        data: {
          column: targetColumn,
          order: index
        }
      })
    )
  ]);
}

async function recalculateTaskStatus(tx, taskId) {
  const subtasks = await tx.subTask.findMany({
    where: { taskId },
    select: { done: true }
  });
  if (subtasks.length === 0) return null;

  const allDone = subtasks.every((s) => s.done);
  const someDone = subtasks.some((s) => s.done);

  let newColumn;
  if (allDone) {
    newColumn = TaskColumn.REVIEW;
  } else if (someDone) {
    newColumn = TaskColumn.IN_PROGRESS;
  } else {
    newColumn = TaskColumn.TODO;
  }

  const task = await tx.projectTask.findUnique({ where: { id: taskId }, select: { column: true } });
  if (!task || task.column === newColumn || task.column === TaskColumn.DONE) return null;

  await tx.projectTask.update({ where: { id: taskId }, data: { column: newColumn } });
  return newColumn;
}

async function recalculateProjectStatus(tx, projectId) {
  const tasks = await tx.projectTask.findMany({
    where: { projectId },
    select: { column: true }
  });
  if (tasks.length === 0) return null;

  const allDone = tasks.every((t) => t.column === TaskColumn.DONE);
  const anyInProgress = tasks.some((t) => t.column === TaskColumn.IN_PROGRESS);
  const anyReview = tasks.some((t) => t.column === TaskColumn.REVIEW);

  const project = await tx.project.findUnique({ where: { id: projectId }, select: { status: true } });
  if (!project) return null;

  let newStatus;
  if (allDone) {
    newStatus = ProjectStatus.COMPLETED;
  } else if (anyInProgress || anyReview) {
    newStatus = ProjectStatus.IN_PROGRESS;
  } else {
    newStatus = ProjectStatus.QUEUED;
  }

  if (newStatus === project.status) return null;

  await tx.project.update({ where: { id: projectId }, data: { status: newStatus } });
  return newStatus;
}

function localDateParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Costa_Rica",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date)
      .filter(({ type }) => type !== "literal")
      .map(({ type, value }) => [type, value])
  );

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute)
  };
}

function isoDateFromUtcDate(date) {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0")
  ].join("-");
}

function scheduleHasCapacity(schedule) {
  return DAY_KEYS.some((day) => Array.isArray(schedule?.[day]) && schedule[day].length > 0);
}

function calculateEta(schedule, pendingHours) {
  if (!scheduleHasCapacity(schedule)) {
    return null;
  }

  const now = localDateParts();
  const startDate = new Date(Date.UTC(now.year, now.month - 1, now.day));
  let remaining = pendingHours;

  for (let offset = 0; offset <= ETA_MAX_DAYS; offset += 1) {
    const candidate = new Date(startDate);
    candidate.setUTCDate(startDate.getUTCDate() + offset);
    const dayKey = DAY_KEYS[candidate.getUTCDay()];
    const configuredHours = Array.isArray(schedule[dayKey])
      ? [...new Set(schedule[dayKey].filter(Number.isInteger))].sort((a, b) => a - b)
      : [];
    const availableHours = offset === 0
      ? configuredHours.filter((hour) => hour > now.hour + (now.minute / 60))
      : configuredHours;

    if (!availableHours.length) {
      continue;
    }
    if (remaining <= 0) {
      return isoDateFromUtcDate(candidate);
    }

    remaining -= availableHours.length;
    if (remaining <= 0) {
      return isoDateFromUtcDate(candidate);
    }
  }

  return null;
}

function activeProjectRemainingHours(project) {
  const estimate = project.estimatedHours || DEFAULT_ESTIMATED_HOURS;
  if (!project.tasks.length) {
    return estimate;
  }
  const incomplete = project.tasks.filter((task) => task.column !== TaskColumn.DONE).length;
  return estimate * (incomplete / project.tasks.length);
}

async function listProjects(req, res, next) {
  try {
    const status = req.query.status ? String(req.query.status).toUpperCase() : null;
    const clientId = req.query.clientId ? parsePositiveInt(req.query.clientId) : null;

    if (status && !PROJECT_STATUSES.includes(status)) {
      return res.status(400).json({ error: "status de proyecto inválido" });
    }
    if (req.query.clientId && !clientId) {
      return res.status(400).json({ error: "clientId inválido" });
    }

    let where;
    if (req.user.role === Role.CLIENT) {
      where = { clientId: req.user.id };
    } else if (req.user.role === Role.COLABORADOR) {
      where = {
        tasks: { some: { assigneeId: req.user.id } },
        ...(status ? { status } : {}),
        ...(clientId ? { clientId } : {})
      };
    } else {
      where = {
        ...(status ? { status } : {}),
        ...(clientId ? { clientId } : {})
      };
    }
    const projects = await prisma.project.findMany({
      where,
      orderBy: [
        { status: "asc" },
        { priority: "asc" },
        { updatedAt: "desc" }
      ],
      include: includeForProject(req.user.role)
    });

    return res.json({ projects });
  } catch (error) {
    return next(error);
  }
}

async function createProject(req, res, next) {
  try {
    const clientId = parsePositiveInt(req.body?.clientId);
    const name = normalizeText(req.body?.name);
    const description = normalizeText(req.body?.description) || null;
    const status = req.body?.status
      ? String(req.body.status).toUpperCase()
      : ProjectStatus.QUEUED;
    const estimatedHours = parseEstimatedHours(req.body?.estimatedHours);

    if (!clientId) {
      return res.status(400).json({ error: "clientId es requerido" });
    }
    if (!name) {
      return res.status(400).json({ error: "El nombre del proyecto es requerido" });
    }
    if (!PROJECT_STATUSES.includes(status)) {
      return res.status(400).json({ error: "status de proyecto inválido" });
    }
    if (estimatedHours === undefined) {
      return res.status(400).json({ error: "estimatedHours debe ser mayor que 0 o null" });
    }

    const client = await prisma.user.findFirst({
      where: {
        id: clientId,
        role: Role.CLIENT
      },
      select: { id: true }
    });
    if (!client) {
      return res.status(404).json({ error: "Cliente no encontrado" });
    }
    if (status === ProjectStatus.IN_PROGRESS) {
      const active = await prisma.project.findFirst({
        where: {
          clientId,
          status: ProjectStatus.IN_PROGRESS
        },
        select: { id: true }
      });
      if (active) {
        return res.status(409).json({ error: "El cliente ya tiene un proyecto en progreso" });
      }
    }

    const project = await prisma.$transaction(async (tx) => {
      const queuedCount = status === ProjectStatus.QUEUED
        ? await tx.project.count({ where: { status: ProjectStatus.QUEUED } })
        : 0;
      return tx.project.create({
        data: {
          clientId,
          name,
          description,
          status,
          priority: status === ProjectStatus.QUEUED ? queuedCount : 0,
          estimatedHours
        },
        include: includeForProject(Role.ADMIN)
      });
    });

    emitProjectEvent(project, "project:updated", { project });
    if (status === ProjectStatus.QUEUED) {
      emitQueueChanged();
    }
    return res.status(201).json(project);
  } catch (error) {
    return next(error);
  }
}

async function updateProject(req, res, next) {
  try {
    const projectId = parsePositiveInt(req.params.id);
    if (!projectId) {
      return res.status(400).json({ error: "ID de proyecto inválido" });
    }

    const current = await prisma.project.findUnique({
      where: { id: projectId }
    });
    if (!current) {
      return res.status(404).json({ error: "Proyecto no encontrado" });
    }

    const allowedFields = ["name", "description", "status", "priority", "estimatedHours"];
    const payloadKeys = Object.keys(req.body || {});
    if (!payloadKeys.length || payloadKeys.some((key) => !allowedFields.includes(key))) {
      return res.status(400).json({ error: "Campos de proyecto inválidos" });
    }

    const data = {};
    if (Object.prototype.hasOwnProperty.call(req.body, "name")) {
      data.name = normalizeText(req.body.name);
      if (!data.name) {
        return res.status(400).json({ error: "El nombre del proyecto es requerido" });
      }
    }
    if (Object.prototype.hasOwnProperty.call(req.body, "description")) {
      data.description = normalizeText(req.body.description) || null;
    }
    if (Object.prototype.hasOwnProperty.call(req.body, "estimatedHours")) {
      const estimatedHours = parseEstimatedHours(req.body.estimatedHours);
      if (estimatedHours === undefined) {
        return res.status(400).json({ error: "estimatedHours debe ser mayor que 0 o null" });
      }
      data.estimatedHours = estimatedHours;
    }

    const nextStatus = Object.prototype.hasOwnProperty.call(req.body, "status")
      ? String(req.body.status).toUpperCase()
      : current.status;
    if (!PROJECT_STATUSES.includes(nextStatus)) {
      return res.status(400).json({ error: "status de proyecto inválido" });
    }
    if (nextStatus === ProjectStatus.IN_PROGRESS && current.status !== ProjectStatus.IN_PROGRESS) {
      const active = await prisma.project.findFirst({
        where: {
          clientId: current.clientId,
          status: ProjectStatus.IN_PROGRESS,
          id: { not: current.id }
        },
        select: { id: true }
      });
      if (active) {
        return res.status(409).json({ error: "El cliente ya tiene un proyecto en progreso" });
      }
    }

    const requestedPriority = Object.prototype.hasOwnProperty.call(req.body, "priority")
      ? parseNonNegativeInt(req.body.priority)
      : null;
    if (Object.prototype.hasOwnProperty.call(req.body, "priority") && requestedPriority === null) {
      return res.status(400).json({ error: "priority debe ser un entero mayor o igual a 0" });
    }

    const project = await prisma.$transaction(async (tx) => {
      const wasQueued = current.status === ProjectStatus.QUEUED;
      const willBeQueued = nextStatus === ProjectStatus.QUEUED;

      if (nextStatus !== current.status) {
        data.status = nextStatus;
      }

      if (wasQueued && !willBeQueued) {
        data.priority = 0;
        await tx.project.update({ where: { id: projectId }, data });
        await normalizeQueue(tx);
      } else if (!wasQueued && willBeQueued) {
        const queuedCount = await tx.project.count({ where: { status: ProjectStatus.QUEUED } });
        data.priority = queuedCount;
        await tx.project.update({ where: { id: projectId }, data });
        if (requestedPriority !== null) {
          await reorderQueue(tx, projectId, requestedPriority);
        }
      } else {
        await tx.project.update({ where: { id: projectId }, data });
        if (willBeQueued && requestedPriority !== null) {
          await reorderQueue(tx, projectId, requestedPriority);
        }
      }

      return tx.project.findUnique({
        where: { id: projectId },
        include: includeForProject(Role.ADMIN)
      });
    });

    emitProjectEvent(project, "project:updated", { project });
    if (current.status === ProjectStatus.QUEUED || project.status === ProjectStatus.QUEUED) {
      emitQueueChanged();
    }
    return res.json(project);
  } catch (error) {
    return next(error);
  }
}

async function deleteProject(req, res, next) {
  try {
    const projectId = parsePositiveInt(req.params.id);
    if (!projectId) {
      return res.status(400).json({ error: "ID de proyecto inválido" });
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return res.status(404).json({ error: "Proyecto no encontrado" });
    }

    await prisma.$transaction(async (tx) => {
      await tx.project.delete({ where: { id: projectId } });
      if (project.status === ProjectStatus.QUEUED) {
        await normalizeQueue(tx);
      }
    });

    emitProjectEvent(project, "project:updated", { deleted: true });
    if (project.status === ProjectStatus.QUEUED) {
      emitQueueChanged();
    }
    return res.json({ deleted: true });
  } catch (error) {
    return next(error);
  }
}

async function listTasks(req, res, next) {
  try {
    const projectId = parsePositiveInt(req.params.id);
    if (!projectId) {
      return res.status(400).json({ error: "ID de proyecto inválido" });
    }

    const project = await findProjectForUser(projectId, req.user);
    if (!project) {
      return res.status(404).json({ error: "Proyecto no encontrado" });
    }

    const tasks = await prisma.projectTask.findMany({
      where: { projectId },
      orderBy: [
        { column: "asc" },
        { order: "asc" },
        { createdAt: "asc" }
      ],
      include: {
        assignee: {
          select: {
            id: true,
            name: true
          }
        },
        subtasks: {
          orderBy: { order: "asc" }
        },
        _count: {
          select: { subtasks: true }
        }
      }
    });
    const grouped = Object.fromEntries(TASK_COLUMNS.map((column) => [column, []]));
    tasks.forEach((task) => grouped[task.column].push(task));

    return res.json({
      project: {
        id: project.id,
        clientId: project.clientId,
        name: project.name,
        status: project.status
      },
      tasks: grouped
    });
  } catch (error) {
    return next(error);
  }
}

async function createTask(req, res, next) {
  try {
    const projectId = parsePositiveInt(req.params.id);
    const title = normalizeText(req.body?.title);
    const column = req.body?.column
      ? String(req.body.column).toUpperCase()
      : TaskColumn.TODO;
    const assigneeId = req.body?.assigneeId
      ? Number.parseInt(req.body.assigneeId, 10)
      : null;
    const description = String(req.body?.description || "").trim() || null;
    const deadline = req.body?.deadline ? new Date(req.body.deadline) : null;
    const TASK_PRIORITIES = Object.values(TaskPriority);
    const priority = req.body?.priority
      ? String(req.body.priority).toUpperCase()
      : TaskPriority.NONE;

    if (!projectId) {
      return res.status(400).json({ error: "ID de proyecto inválido" });
    }
    if (!title) {
      return res.status(400).json({ error: "El título de la tarea es requerido" });
    }
    if (!TASK_COLUMNS.includes(column)) {
      return res.status(400).json({ error: "Columna de tarea inválida" });
    }
    if (req.body?.assigneeId && (!Number.isInteger(assigneeId) || assigneeId <= 0)) {
      return res.status(400).json({ error: "Asignado inválido" });
    }
    if (req.body?.deadline && Number.isNaN(deadline.getTime())) {
      return res.status(400).json({ error: "deadline inválido" });
    }
    if (!TASK_PRIORITIES.includes(priority)) {
      return res.status(400).json({ error: "Prioridad de tarea inválida" });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: req.user.role === Role.COLABORADOR
        ? { tasks: { where: { assigneeId: req.user.id }, select: { id: true }, take: 1 } }
        : undefined
    });
    if (!project) {
      return res.status(404).json({ error: "Proyecto no encontrado" });
    }
    if (req.user.role === Role.COLABORADOR && !project.tasks.length) {
      return res.status(403).json({ error: "Sin acceso a este proyecto" });
    }
    if (project.status === ProjectStatus.COMPLETED) {
      return res.status(409).json({ error: "Reabrí el proyecto antes de editar sus tareas" });
    }
    const finalAssigneeId = req.user.role === Role.COLABORADOR ? req.user.id : assigneeId;
    if (assigneeId) {
      const assignee = await prisma.user.findUnique({
        where: { id: assigneeId },
        select: { id: true }
      });
      if (!assignee) {
        return res.status(404).json({ error: "Asignado no encontrado" });
      }
    }

    const task = await prisma.$transaction(async (tx) => {
      const order = await tx.projectTask.count({
        where: { projectId, column }
      });
      const created = await tx.projectTask.create({
        data: {
          projectId,
          title,
          column,
          order,
          assigneeId: finalAssigneeId,
          description,
          deadline,
          priority
        }
      });
      await recalculateProjectStatus(tx, projectId);
      return created;
    });

    emitProjectEvent(project, "project:task-moved", { task });
    return res.status(201).json(task);
  } catch (error) {
    return next(error);
  }
}

async function updateTask(req, res, next) {
  try {
    const taskId = parsePositiveInt(req.params.taskId);
    if (!taskId) {
      return res.status(400).json({ error: "ID de tarea inválido" });
    }

    const task = await prisma.projectTask.findUnique({
      where: { id: taskId },
      include: { project: true }
    });
    if (!task) {
      return res.status(404).json({ error: "Tarea no encontrada" });
    }
    if (task.project.status === ProjectStatus.COMPLETED) {
      return res.status(409).json({ error: "Reabrí el proyecto antes de editar sus tareas" });
    }

    if (req.user.role === Role.COLABORADOR) {
      if (task.assigneeId !== req.user.id) {
        return res.status(403).json({ error: "Solo puedes modificar tus tareas asignadas" });
      }
      const isMoving = Object.prototype.hasOwnProperty.call(req.body, "column") || Object.prototype.hasOwnProperty.call(req.body, "order");
      const isReassigning = Object.prototype.hasOwnProperty.call(req.body, "assigneeId");
      if (isMoving) {
        if (task.assigneeId !== null && task.assigneeId !== req.user.id) {
          return res.status(403).json({ error: "Solo puedes mover tus propias tareas" });
        }
        if (task.assigneeId === null) {
          return res.status(403).json({ error: "Solo un administrador puede mover tareas sin asignar" });
        }
      }
      if (isReassigning) {
        return res.status(403).json({ error: "Solo un administrador puede reasignar tareas" });
      }
    } else if (req.user.role === Role.ADMIN) {
      const isMoving = Object.prototype.hasOwnProperty.call(req.body, "column") || Object.prototype.hasOwnProperty.call(req.body, "order");
      if (isMoving && task.assigneeId !== null && task.assigneeId !== req.user.id) {
        return res.status(403).json({ error: "Solo puedes mover tus propias tareas o las sin asignar" });
      }
    }

    const payloadKeys = Object.keys(req.body || {});
    if (!payloadKeys.length || payloadKeys.some((key) => !["title", "column", "order", "assigneeId", "description", "deadline", "priority"].includes(key))) {
      return res.status(400).json({ error: "Campos de tarea inválidos" });
    }

    const title = Object.prototype.hasOwnProperty.call(req.body, "title")
      ? normalizeText(req.body.title)
      : null;
    if (Object.prototype.hasOwnProperty.call(req.body, "title") && !title) {
      return res.status(400).json({ error: "El título de la tarea es requerido" });
    }
    const targetColumn = Object.prototype.hasOwnProperty.call(req.body, "column")
      ? String(req.body.column).toUpperCase()
      : task.column;
    if (!TASK_COLUMNS.includes(targetColumn)) {
      return res.status(400).json({ error: "Columna de tarea inválida" });
    }
    const requestedOrder = Object.prototype.hasOwnProperty.call(req.body, "order")
      ? parseNonNegativeInt(req.body.order)
      : task.order;
    if (requestedOrder === null) {
      return res.status(400).json({ error: "order debe ser un entero mayor o igual a 0" });
    }
    const assigneeId = Object.prototype.hasOwnProperty.call(req.body, "assigneeId")
      ? (req.body.assigneeId ? Number.parseInt(req.body.assigneeId, 10) : null)
      : undefined;
    if (assigneeId !== undefined && assigneeId !== null && (!Number.isInteger(assigneeId) || assigneeId <= 0)) {
      return res.status(400).json({ error: "Asignado inválido" });
    }
    const description = Object.prototype.hasOwnProperty.call(req.body, "description")
      ? (String(req.body.description || "").trim() || null)
      : undefined;
    const deadline = Object.prototype.hasOwnProperty.call(req.body, "deadline")
      ? (req.body.deadline ? new Date(req.body.deadline) : null)
      : undefined;
    if (deadline !== undefined && deadline !== null && Number.isNaN(deadline.getTime())) {
      return res.status(400).json({ error: "deadline inválido" });
    }
    const priority = Object.prototype.hasOwnProperty.call(req.body, "priority")
      ? String(req.body.priority).toUpperCase()
      : undefined;
    if (priority !== undefined && !Object.values(TaskPriority).includes(priority)) {
      return res.status(400).json({ error: "Prioridad de tarea inválida" });
    }
    if (assigneeId) {
      const assignee = await prisma.user.findUnique({
        where: { id: assigneeId },
        select: { id: true }
      });
      if (!assignee) {
        return res.status(404).json({ error: "Asignado no encontrado" });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      if (title !== null) {
        await tx.projectTask.update({
          where: { id: taskId },
          data: { title }
        });
      }

      if (targetColumn !== task.column || requestedOrder !== task.order) {
        await moveTask(tx, task, targetColumn, requestedOrder);
      }

      if (assigneeId !== undefined) {
        await tx.projectTask.update({
          where: { id: taskId },
          data: { assigneeId }
        });
      }
      if (description !== undefined) {
        await tx.projectTask.update({
          where: { id: taskId },
          data: { description }
        });
      }
      if (deadline !== undefined) {
        await tx.projectTask.update({
          where: { id: taskId },
          data: { deadline }
        });
      }
      if (priority !== undefined) {
        await tx.projectTask.update({
          where: { id: taskId },
          data: { priority }
        });
      }

      const updatedTask = await tx.projectTask.findUnique({ where: { id: taskId } });

      await recalculateProjectStatus(tx, task.projectId);
      const updatedProject = await tx.project.findUnique({ where: { id: task.projectId } });

      return { updatedTask, updatedProject };
    });

    emitProjectEvent(result.updatedProject, "project:task-moved", {
      task: result.updatedTask
    });
    if (result.updatedProject.status !== task.project.status) {
      emitProjectEvent(result.updatedProject, "project:updated", {
        project: result.updatedProject
      });
      if (task.project.status === ProjectStatus.QUEUED) {
        emitQueueChanged();
      }
    }
    return res.json({
      task: result.updatedTask,
      project: result.updatedProject
    });
  } catch (error) {
    return next(error);
  }
}

async function deleteTask(req, res, next) {
  try {
    const taskId = parsePositiveInt(req.params.taskId);
    if (!taskId) {
      return res.status(400).json({ error: "ID de tarea inválido" });
    }

    const task = await prisma.projectTask.findUnique({
      where: { id: taskId },
      include: { project: true }
    });
    if (!task) {
      return res.status(404).json({ error: "Tarea no encontrada" });
    }
    if (task.project.status === ProjectStatus.COMPLETED) {
      return res.status(409).json({ error: "Reabrí el proyecto antes de editar sus tareas" });
    }

    if (req.user.role === Role.COLABORADOR && task.assigneeId !== req.user.id) {
      return res.status(403).json({ error: "Solo puedes eliminar tus tareas asignadas" });
    }

    await prisma.$transaction(async (tx) => {
      await tx.projectTask.delete({ where: { id: taskId } });
      await normalizeTaskColumn(tx, task.projectId, task.column);
    });

    emitProjectEvent(task.project, "project:task-moved", {
      taskId,
      deleted: true
    });
    return res.json({ deleted: true });
  } catch (error) {
    return next(error);
  }
}

async function getEta(req, res, next) {
  try {
    const projectId = parsePositiveInt(req.params.id);
    if (!projectId) {
      return res.status(400).json({ error: "ID de proyecto inválido" });
    }

    const project = await findProjectForUser(projectId, req.user);
    if (!project) {
      return res.status(404).json({ error: "Proyecto no encontrado" });
    }
    if (project.status !== ProjectStatus.QUEUED) {
      return res.json({
        eta: null,
        queuePosition: 0,
        pendingHours: 0
      });
    }

    const [queuedBefore, activeProjects, adminStatus] = await Promise.all([
      prisma.project.findMany({
        where: {
          status: ProjectStatus.QUEUED,
          priority: { lt: project.priority }
        },
        orderBy: { priority: "asc" },
        select: { estimatedHours: true }
      }),
      prisma.project.findMany({
        where: {
          status: ProjectStatus.IN_PROGRESS,
          clientId: { not: project.clientId }
        },
        select: {
          estimatedHours: true,
          tasks: {
            select: { column: true }
          }
        }
      }),
      prisma.adminStatus.findUnique({
        where: { id: 1 },
        select: { schedule: true }
      })
    ]);

    const queuedHours = queuedBefore.reduce(
      (sum, queuedProject) => sum + (queuedProject.estimatedHours || DEFAULT_ESTIMATED_HOURS),
      0
    );
    const activeHours = activeProjects.reduce(
      (sum, activeProject) => sum + activeProjectRemainingHours(activeProject),
      0
    );
    const pendingHours = Number((queuedHours + activeHours).toFixed(2));
    const queuePosition = queuedBefore.length + 1;
    const eta = calculateEta(adminStatus?.schedule || {}, pendingHours);

    return res.json({
      eta,
      queuePosition,
      pendingHours
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listProjects,
  createProject,
  updateProject,
  deleteProject,
  listTasks,
  createTask,
  updateTask,
  deleteTask,
  getEta,
  recalculateTaskStatus,
  recalculateProjectStatus
};
