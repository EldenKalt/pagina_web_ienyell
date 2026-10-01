const { Role } = require("@prisma/client");
const prisma = require("../lib/prisma");
const { recalculateTaskStatus, recalculateProjectStatus } = require("./projectsController");

function parsePositiveInt(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

async function authorizeTaskAccess(taskId, user) {
  const task = await prisma.projectTask.findUnique({
    where: { id: taskId },
    select: { id: true, assigneeId: true, projectId: true }
  });
  if (!task) return null;
  if (user.role === Role.ADMIN) return task;
  if (user.role === Role.COLABORADOR && task.assigneeId === user.id) return task;
  return false;
}

async function getSubtasks(req, res, next) {
  try {
    const taskId = parsePositiveInt(req.params.taskId);
    if (!taskId) return res.status(400).json({ error: "ID de tarea inválido" });

    const access = await authorizeTaskAccess(taskId, req.user);
    if (access === null) return res.status(404).json({ error: "Tarea no encontrada" });
    if (access === false) return res.status(403).json({ error: "Sin acceso a esta tarea" });

    const subtasks = await prisma.subTask.findMany({
      where: { taskId },
      orderBy: { order: "asc" }
    });
    return res.json({ subtasks });
  } catch (error) {
    return next(error);
  }
}

async function createSubtask(req, res, next) {
  try {
    const taskId = parsePositiveInt(req.params.taskId);
    if (!taskId) return res.status(400).json({ error: "ID de tarea inválido" });

    const title = String(req.body?.title || "").trim();
    if (!title) return res.status(400).json({ error: "El título es requerido" });

    const access = await authorizeTaskAccess(taskId, req.user);
    if (access === null) return res.status(404).json({ error: "Tarea no encontrada" });
    if (access === false) return res.status(403).json({ error: "Sin acceso a esta tarea" });

    const subtask = await prisma.$transaction(async (tx) => {
      const order = await tx.subTask.count({ where: { taskId } });
      const created = await tx.subTask.create({ data: { taskId, title, order } });
      await recalculateTaskStatus(tx, taskId);
      await recalculateProjectStatus(tx, access.projectId);
      return created;
    });

    return res.status(201).json({ subtask });
  } catch (error) {
    return next(error);
  }
}

async function updateSubtask(req, res, next) {
  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) return res.status(400).json({ error: "ID de subtarea inválido" });

    const subtask = await prisma.subTask.findUnique({
      where: { id },
      include: { task: { select: { id: true, assigneeId: true, projectId: true } } }
    });
    if (!subtask) return res.status(404).json({ error: "Subtarea no encontrada" });

    if (req.user.role === Role.COLABORADOR && subtask.task.assigneeId !== req.user.id) {
      return res.status(403).json({ error: "Sin acceso a esta subtarea" });
    }

    const data = {};
    if (Object.prototype.hasOwnProperty.call(req.body, "title")) {
      const title = String(req.body.title || "").trim();
      if (!title) return res.status(400).json({ error: "El título es requerido" });
      data.title = title;
    }
    if (Object.prototype.hasOwnProperty.call(req.body, "done")) {
      data.done = Boolean(req.body.done);
    }
    if (Object.prototype.hasOwnProperty.call(req.body, "order")) {
      const order = Number.parseInt(req.body.order, 10);
      if (!Number.isInteger(order) || order < 0) {
        return res.status(400).json({ error: "order inválido" });
      }
      data.order = order;
    }

    if (!Object.keys(data).length) {
      return res.status(400).json({ error: "Nada que actualizar" });
    }

    const shouldRecalculate = Object.prototype.hasOwnProperty.call(data, "done");
    const updated = shouldRecalculate
      ? await prisma.$transaction(async (tx) => {
          const result = await tx.subTask.update({ where: { id }, data });
          await recalculateTaskStatus(tx, subtask.taskId);
          await recalculateProjectStatus(tx, subtask.task.projectId);
          return result;
        })
      : await prisma.subTask.update({ where: { id }, data });
    return res.json({ subtask: updated });
  } catch (error) {
    return next(error);
  }
}

async function toggleSubtask(req, res, next) {
  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) return res.status(400).json({ error: "ID de subtarea inválido" });

    const subtask = await prisma.subTask.findUnique({
      where: { id },
      include: { task: { select: { id: true, assigneeId: true, projectId: true } } }
    });
    if (!subtask) return res.status(404).json({ error: "Subtarea no encontrada" });

    if (req.user.role === Role.COLABORADOR && subtask.task.assigneeId !== req.user.id) {
      return res.status(403).json({ error: "Sin acceso a esta subtarea" });
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.subTask.update({
        where: { id },
        data: { done: !subtask.done }
      });
      await recalculateTaskStatus(tx, subtask.taskId);
      await recalculateProjectStatus(tx, subtask.task.projectId);
      return updated;
    });
    return res.json({ subtask: result });
  } catch (error) {
    return next(error);
  }
}

async function deleteSubtask(req, res, next) {
  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) return res.status(400).json({ error: "ID de subtarea inválido" });

    const subtask = await prisma.subTask.findUnique({
      where: { id },
      include: { task: { select: { id: true, assigneeId: true, projectId: true } } }
    });
    if (!subtask) return res.status(404).json({ error: "Subtarea no encontrada" });

    if (req.user.role === Role.COLABORADOR && subtask.task.assigneeId !== req.user.id) {
      return res.status(403).json({ error: "Sin acceso a esta subtarea" });
    }

    await prisma.$transaction(async (tx) => {
      await tx.subTask.delete({ where: { id } });
      await recalculateTaskStatus(tx, subtask.taskId);
      await recalculateProjectStatus(tx, subtask.task.projectId);
    });
    return res.json({ message: "Subtarea eliminada" });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getSubtasks,
  createSubtask,
  updateSubtask,
  toggleSubtask,
  deleteSubtask
};
