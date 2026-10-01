const prisma = require("../lib/prisma");

const PUBLISH_CHECK_INTERVAL_MS = 30000;

let publishTimer = null;
let isRunning = false;

async function publishDueBlogPosts(now = new Date()) {
  return prisma.blogPost.updateMany({
    where: {
      isPublished: false,
      publishedAt: {
        not: null,
        lte: now
      }
    },
    data: {
      isPublished: true
    }
  });
}

async function publishDuePortfolioProjects(now = new Date()) {
  return prisma.portfolioProject.updateMany({
    where: {
      isPublished: false,
      publishedAt: {
        not: null,
        lte: now
      }
    },
    data: {
      isPublished: true
    }
  });
}

async function publishDueContent() {
  if (isRunning) return;
  isRunning = true;

  try {
    const now = new Date();
    await Promise.all([
      publishDueBlogPosts(now),
      publishDuePortfolioProjects(now)
    ]);
  } catch (error) {
    console.error("Publishing scheduler error:", error);
  } finally {
    isRunning = false;
  }
}

function startPublishingScheduler() {
  if (publishTimer) return publishTimer;

  void publishDueContent();
  publishTimer = setInterval(() => {
    void publishDueContent();
  }, PUBLISH_CHECK_INTERVAL_MS);

  if (typeof publishTimer.unref === "function") {
    publishTimer.unref();
  }

  return publishTimer;
}

module.exports = {
  publishDueContent,
  publishDueBlogPosts,
  publishDuePortfolioProjects,
  startPublishingScheduler
};
