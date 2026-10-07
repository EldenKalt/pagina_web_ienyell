const express = require('express');
const prisma = require('../lib/prisma');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { publishDuePortfolioProjects, publishDueBlogPosts } = require('../services/publishingScheduler');

const router = express.Router();

function isPlainObject(value) {
  return value !== null && typeof value === 'object'
    && [Object.prototype, null].includes(Object.getPrototypeOf(value));
}

function pendingType(payload) {
  if (!isPlainObject(payload)) return null;
  for (const value of [payload.service, payload.category, payload.wizard]) {
    if (typeof value === 'string' && value.trim()) return value.trim().slice(0, 120);
  }
  return null;
}

function total(groups) {
  return groups.reduce((sum, row) => sum + row._count._all, 0);
}

router.get('/summary', authenticateToken, authorizeRole('ADMIN'), async (_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  try {
    await Promise.all([publishDuePortfolioProjects(), publishDueBlogPosts()]);
    const [portfolio, blog, commissions, latestPending, waitlistTotal] = await Promise.all([
      prisma.portfolioProject.groupBy({ by: ['isPublished'], _count: { _all: true } }),
      prisma.blogPost.groupBy({ by: ['isPublished'], _count: { _all: true } }),
      prisma.commissionRequest.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.commissionRequest.findMany({
        where: { status: 'pending' },
        orderBy: [{ receivedAt: 'desc' }, { id: 'desc' }],
        take: 4,
        select: { id: true, name: true, payload: true, receivedAt: true },
      }),
      prisma.waitlistEntry.count(),
    ]);
    return res.json({
      portfolio: {
        total: total(portfolio),
        published: portfolio.find((row) => row.isPublished === true)?._count._all ?? 0,
      },
      blog: {
        total: total(blog),
        published: blog.find((row) => row.isPublished === true)?._count._all ?? 0,
      },
      commissions: {
        total: total(commissions),
        pending: commissions.find((row) => row.status === 'pending')?._count._all ?? 0,
        latestPending: latestPending.map((row) => ({
          id: row.id,
          name: String(row.name).slice(0, 120),
          type: pendingType(row.payload),
          receivedAt: new Date(row.receivedAt).toISOString(),
        })),
      },
      waitlist: { total: waitlistTotal },
    });
  } catch (error) {
    return next(Object.assign(new Error('Admin summary error'), { code: error?.code }));
  }
});

module.exports = router;
