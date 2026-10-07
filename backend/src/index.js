const http = require('http');
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
require('dotenv').config();

const jwtSecret = process.env.JWT_SECRET || '';
if (
  !jwtSecret ||
  jwtSecret.startsWith('cambiar-') ||
  Buffer.byteLength(jwtSecret, 'utf8') < 32
) {
  console.error('JWT_SECRET ausente, es un placeholder, o es demasiado corto (mínimo 32 bytes). Abortando arranque.');
  process.exit(1);
}

const { getAllowedOrigins } = require('./utils/publicUrl');

const allowedOrigins = getAllowedOrigins();
const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const projectsRouter = require('./routes/projects');
const subtasksRouter = require('./routes/subtasks');
const productsRouter = require('./routes/products');
const notificationsRouter = require('./routes/notifications');
const availabilityRouter = require('./routes/availability');
const contactRouter = require('./routes/contact');
const messagesRouter = require('./routes/messages');
const ticketsRouter = require('./routes/tickets');
const legalRouter = require('./routes/legal');
const faqRouter = require('./routes/faq');
const downloadsRouter = require('./routes/downloads');
const uploadsRouter = require('./routes/uploads');
const testimonialsRouter = require('./routes/testimonials');
const portfolioRouter = require('./routes/portfolio');
const blogRouter = require('./routes/blog');
const addonsRouter = require('./routes/addons');
const revisionsRouter = require('./routes/revisions');
const discountsRouter = require('./routes/discounts');
const serviceCategoriesRouter = require('./routes/serviceCategories');
const calculatorConfigsRouter = require('./routes/calculatorConfigs');
const calculatorOptionsRouter = require('./routes/calculatorOptions');
const wizardFlowsRouter = require('./routes/wizardFlows');
const serviceCatalogRouter = require('./routes/serviceCatalog');
const linkButtonsRouter = require('./routes/linkButtons');
const referralsRouter = require('./routes/referrals');
const installmentsRouter = require('./routes/installments');
const checkoutRouter = require('./routes/checkout');
const webhooksRouter = require('./routes/webhooks');
const cartRouter = require('./routes/cart');
const reportsRouter = require('./routes/reports');
const nsfwAccessRouter = require('./routes/nsfwAccess');
const commissionsRouter = require('./routes/commissions');
const waitlistRouter = require('./routes/waitlist');
const errorHandler = require('./middleware/errorHandler');
const prisma = require('./lib/prisma');
const { startPublishingScheduler } = require('./services/publishingScheduler');

const app = express();
fs.mkdirSync(path.join(__dirname, '../uploads/tmp'), { recursive: true });
fs.mkdirSync(path.join(__dirname, '../uploads/commissions'), { recursive: true });
app.set('trust proxy', 1);
const server = http.createServer(app);

function parseCookieHeader(cookieHeader = '') {
  return cookieHeader.split(';').reduce((cookies, pair) => {
    const separatorIndex = pair.indexOf('=');
    if (separatorIndex === -1) {
      return cookies;
    }
    const key = pair.slice(0, separatorIndex).trim();
    const value = pair.slice(separatorIndex + 1).trim();
    if (!key) {
      return cookies;
    }
    try {
      cookies[key] = decodeURIComponent(value);
    } catch {
      cookies[key] = value;
    }
    return cookies;
  }, {});
}

function tokenFromSocket(socket) {
  const authToken = socket.handshake.auth?.token;
  if (authToken) {
    return authToken;
  }
  return parseCookieHeader(socket.handshake.headers?.cookie).ienyell_session || null;
}

const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true
  }
});

io.use(async (socket, next) => {
  const token = tokenFromSocket(socket);
  if (!token) {
    return next(new Error('Sin autenticación'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'], issuer: 'ienyell-api', audience: 'ienyell-app' });
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { isActive: true, role: true }
    });

    if (!user || !user.isActive) {
      return next(new Error('Cuenta desactivada'));
    }

    socket.userId = decoded.id;
    socket.userRole = user.role;
    return next();
  } catch (error) {
    return next(new Error('Token inválido'));
  }
});

io.on('connection', (socket) => {
  socket.join(`user-${socket.userId}`);
  socket.join(`role-${socket.userRole}`);

  socket.on('ticket:join', async (ticketId) => {
    const parsedTicketId = Number.parseInt(ticketId, 10);
    if (!Number.isInteger(parsedTicketId) || parsedTicketId <= 0) {
      return;
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: parsedTicketId },
      select: { id: true, clientId: true, assignedAgentId: true }
    }).catch(() => null);

    if (!ticket) {
      return;
    }

    if (socket.userRole === 'ADMIN') {
      socket.join(`ticket-${parsedTicketId}`);
      return;
    }

    if (ticket.clientId === socket.userId) {
      socket.join(`ticket-${parsedTicketId}`);
      return;
    }

    if (socket.userRole === 'COLABORADOR') {
      if (ticket.assignedAgentId === socket.userId) {
        socket.join(`ticket-${parsedTicketId}`);
        return;
      }

      const assignment = await prisma.clientCollaborator.findUnique({
        where: {
          clientId_collaboratorId: {
            clientId: ticket.clientId,
            collaboratorId: socket.userId
          }
        }
      }).catch(() => null);

      if (assignment) {
        socket.join(`ticket-${parsedTicketId}`);
      }
    }
  });

  socket.on('ticket:leave', (ticketId) => {
    const parsedTicketId = Number.parseInt(ticketId, 10);
    if (!Number.isInteger(parsedTicketId) || parsedTicketId <= 0) {
      return;
    }
    socket.leave(`ticket-${parsedTicketId}`);
  });

  socket.on('project:join', async (projectId) => {
    const parsedProjectId = Number.parseInt(projectId, 10);
    if (!Number.isInteger(parsedProjectId) || parsedProjectId <= 0) {
      return;
    }

    const project = await prisma.project.findUnique({
      where: { id: parsedProjectId },
      select: { id: true, clientId: true }
    }).catch(() => null);

    if (!project) {
      return;
    }
    if (socket.userRole !== 'ADMIN' && project.clientId !== socket.userId) {
      return;
    }

    socket.join(`project-${parsedProjectId}`);
  });

  socket.on('project:leave', (projectId) => {
    const parsedProjectId = Number.parseInt(projectId, 10);
    if (!Number.isInteger(parsedProjectId) || parsedProjectId <= 0) {
      return;
    }
    socket.leave(`project-${parsedProjectId}`);
  });
});

app.use(helmet({
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' }
}));
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(cookieParser());
// Mount webhook route before JSON parsing to preserve Onvo's raw request body.
app.use('/api/webhooks', webhooksRouter);
app.use('/api/cart', cartRouter);
app.use(express.json({ limit: '1mb' }));

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/projects', projectsRouter);
app.use('/api', subtasksRouter);
app.use('/api/products', productsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/availability', availabilityRouter);
app.use('/api/contact', contactRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/tickets', ticketsRouter);
app.use('/api/legal', legalRouter);
app.use('/api/faq', faqRouter);
app.use('/api/downloads', downloadsRouter);
app.use('/api/uploads', uploadsRouter);
app.use('/api/testimonials', testimonialsRouter);
app.use('/api/portfolio', portfolioRouter);
app.use('/api/blog', blogRouter);
app.use('/api/notes', require('./routes/notes'));
app.use('/api/comments', require('./routes/comments'));
  app.use('/api/reader-profiles', require('./routes/readerProfiles'));
app.use('/api', addonsRouter);
app.use('/api', revisionsRouter);
app.use('/api/discounts', discountsRouter);
app.use('/api/service-categories', serviceCategoriesRouter);
app.use('/api/calculator-configs', calculatorConfigsRouter);
app.use('/api/calculator-options', calculatorOptionsRouter);
app.use('/api/wizard-flows', wizardFlowsRouter);
app.use('/api/service-catalog', serviceCatalogRouter);
app.use('/api/link-buttons', linkButtonsRouter);
app.use('/api/referrals', referralsRouter);
app.use('/api/installments', installmentsRouter);
app.use('/api/checkout', checkoutRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/nsfw-access', nsfwAccessRouter);
app.use('/api/newsletter', require('./routes/newsletter'));
app.use('/api/commissions', commissionsRouter);
app.use('/api/waitlist', waitlistRouter);
app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));
app.use((_req, res) => res.status(404).json({ error: 'Not Found' }));
app.use(errorHandler);

const PORT = process.env.PORT || 3001;
startPublishingScheduler();
server.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});

module.exports = { app, server, io };
