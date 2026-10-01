const { ContractStatus, ProjectStatus, Role, TaskColumn } = require("@prisma/client");
const prisma = require("../lib/prisma");

function parseMonths(value) {
  if (value === undefined) {
    return 6;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function monthRange(months) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
  return start;
}

function monthKey(date) {
  const target = new Date(date);
  const year = target.getFullYear();
  const month = String(target.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function decimalToNumber(value) {
  if (value == null) {
    return 0;
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return Number(value);
  }

  if (typeof value.toNumber === "function") {
    return value.toNumber();
  }

  return Number(value);
}

function groupedMonths(rows, getDate, getValue) {
  const grouped = new Map();

  rows.forEach((row) => {
    const key = monthKey(getDate(row));
    const previous = grouped.get(key) || 0;
    grouped.set(key, previous + getValue(row));
  });

  return Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, value]) => ({ month, value }));
}

async function getClientReport(req, res, next) {
  try {
    const months = parseMonths(req.query.months);
    if (!months) {
      return res.status(400).json({ error: "months debe ser un entero positivo" });
    }

    const startDate = monthRange(months);
    const taskWhere = {
      column: TaskColumn.DONE,
      project: { clientId: req.user.id },
      createdAt: { gte: startDate }
    };

    const [tasksInRange, activeProjects, recentTasks] = await Promise.all([
      prisma.projectTask.findMany({
        where: taskWhere,
        orderBy: { createdAt: "asc" }
      }),
      prisma.project.count({
        where: {
          clientId: req.user.id,
          status: ProjectStatus.IN_PROGRESS
        }
      }),
      prisma.projectTask.findMany({
        where: taskWhere,
        include: { project: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 5
      })
    ]);

    const tasksPerMonth = groupedMonths(
      tasksInRange,
      (task) => task.createdAt,
      () => 1
    ).map((entry) => ({
      month: entry.month,
      count: entry.value
    }));

    const recentActivity = recentTasks.map((task) => ({
      month: monthKey(task.createdAt),
      title: task.title,
      projectName: task.project?.name || "Proyecto",
      completedAt: task.createdAt
    }));

    return res.json({
      tasksPerMonth,
      totalTasksCompleted: tasksInRange.length,
      activeProjects,
      recentActivity
    });
  } catch (error) {
    return next(error);
  }
}

async function getAdminReport(req, res, next) {
  try {
    const months = parseMonths(req.query.months);
    if (!months) {
      return res.status(400).json({ error: "months debe ser un entero positivo" });
    }

    const startDate = monthRange(months);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [contractsInRange, activeClientRows, newClientsThisMonth, allContracts, tasksCompletedThisMonth, projectsInProgress] = await Promise.all([
      prisma.clientProduct.findMany({
        where: { startDate: { gte: startDate } },
        include: { product: { select: { id: true, name: true } } },
        orderBy: { startDate: "asc" }
      }),
      prisma.clientProduct.findMany({
        where: { status: ContractStatus.ACTIVE },
        select: { clientId: true },
        distinct: ["clientId"]
      }),
      prisma.user.count({
        where: {
          role: Role.CLIENT,
          createdAt: { gte: monthStart }
        }
      }),
      prisma.clientProduct.findMany({
        where: { startDate: { gte: startDate } }
      }),
      prisma.projectTask.count({
        where: {
          column: TaskColumn.DONE,
          createdAt: { gte: monthStart }
        }
      }),
      prisma.project.count({
        where: { status: ProjectStatus.IN_PROGRESS }
      })
    ]);

    const revenuePerMonth = groupedMonths(
      contractsInRange,
      (contract) => contract.startDate,
      (contract) => decimalToNumber(contract.price)
    ).map((entry) => ({
      month: entry.month,
      revenue: entry.value
    }));

    const totalRevenue = contractsInRange.reduce(
      (sum, contract) => sum + decimalToNumber(contract.price),
      0
    );

    const topProductsMap = new Map();
    contractsInRange.forEach((contract) => {
      const current = topProductsMap.get(contract.productId) || {
        productId: contract.productId,
        name: contract.product?.name || "Producto",
        units: 0,
        revenue: 0
      };

      current.units += 1;
      current.revenue += decimalToNumber(contract.price);
      topProductsMap.set(contract.productId, current);
    });

    const topProducts = Array.from(topProductsMap.values())
      .sort((a, b) => b.revenue - a.revenue);

    const renewableContracts = allContracts.length;
    const renewedContracts = allContracts.filter((contract) => contract.renewalDate != null).length;
    const renewalRate = renewableContracts
      ? (renewedContracts / renewableContracts) * 100
      : 0;

    return res.json({
      revenuePerMonth,
      totalRevenue,
      activeClients: activeClientRows.length,
      newClientsThisMonth,
      renewalRate,
      topProducts,
      tasksCompletedThisMonth,
      projectsInProgress
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getClientReport,
  getAdminReport
};
