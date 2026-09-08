/**
 * Examify - AI-Powered Online Examination System
 * Main Server Entry Point
 */
import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { connectDB } from './config/database.js';
import { initSocket } from './socket/socketManager.js';
import { errorHandler } from './middleware/errorHandler.js';
import { generalApiLimiter } from './middleware/rateLimiter.js';
import { v4 as uuidv4 } from 'uuid';
import { sendError } from './utils/apiResponse.js';

// Route imports
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import testRoutes from './routes/tests.js';
import questionRoutes from './routes/questions.js';
import submissionRoutes from './routes/submissions.js';
import aiRoutes from './routes/ai.js';
import analyticsRoutes from './routes/analytics.js';
import subscriptionRoutes from './routes/subscriptions.js';
import notificationRoutes from './routes/notifications.js';
import adminRoutes from './routes/admin.js';
import reportRoutes from './routes/reports.js';
import courseManagementRoutes from './routes/courseManagement.js';
import academicRoutes from './routes/academic.js';
import chatRoutes from './routes/chat.js';
import resultRoutes from './routes/results.js';
import groupRoutes from './routes/groups.js';
import teacherEvaluationRoutes from './routes/teacherEvaluation.js';
import retakeRoutes from './routes/retake.js';
import reviewRoutes from './routes/reviews.js';
import { initEvaluationWorker } from './workers/evaluation.worker.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });


const app = express();
const httpServer = createServer(app);

const allowedOrigins = new Set([
  'http://localhost:5173',
    'http://127.0.0.1:5173',
  process.env.FRONTEND_URL,
  ...(process.env.CORS_ORIGINS || '').split(',').map((origin) => origin.trim()).filter(Boolean),
].filter(Boolean));
const allowedOriginPatterns = [
  /^https:\/\/[a-z0-9-]+\.vercel\.app$/i,
  ...(process.env.CORS_ORIGIN_REGEX || '')
    .split(',')
    .map((pattern) => pattern.trim())
    .filter(Boolean)
    .flatMap((pattern) => {
      try {
        return [new RegExp(pattern)];
      } catch (error) {
        console.warn(`Ignoring invalid CORS_ORIGIN_REGEX pattern: ${pattern}`, error.message);
        return [];
      }
    }),
];

const isAllowedOrigin = (origin = '') => {
  if (!origin) return true;
   if (allowedOrigins.has(origin)) return true;
  return allowedOriginPatterns.some((pattern) => pattern.test(origin));
};
// Initialize Socket.io
export const io = initSocket(httpServer);
app.set('io', io);

// Connect to MongoDB
if (process.env.NODE_ENV !== 'test') {
  connectDB();
  initEvaluationWorker();
}
// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'", ...[...allowedOrigins].filter((o) => o.startsWith('http'))],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: [],
    },
  },
  referrerPolicy: { policy: 'no-referrer' },
}));
app.use((req, res, next) => {
  req.id = uuidv4();
  res.setHeader('X-Request-Id', req.id);
  const header = req.headers.cookie || '';
  req.cookies = header.split(';').reduce((acc, part) => {
    const [rawKey, ...rawVal] = part.trim().split('=');
    if (!rawKey) return acc;
    const rawValue = rawVal.join('=') || '';
    try {
      acc[rawKey] = decodeURIComponent(rawValue);
    } catch {
      acc[rawKey] = rawValue;
    }
    return acc;
  }, {});
  next();
});

app.use(cors({
 origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
 allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Idempotency-Key',
    'X-Submit-Attempt-Id',
    'X-Requested-With',
  ],
  exposedHeaders: ['X-Request-Id'],
}));

morgan.token('req-id', (req) => req.id);
app.use(morgan(':method :url :status :response-time ms - reqId=:req-id'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadsDir));

// ─── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', generalApiLimiter, userRoutes);
app.use('/api/tests', generalApiLimiter, testRoutes);
app.use('/api/questions', generalApiLimiter, questionRoutes);
app.use('/api/retake', generalApiLimiter, retakeRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/ai', generalApiLimiter, aiRoutes);
app.use('/api/analytics', generalApiLimiter, analyticsRoutes);
app.use('/api/subscriptions', generalApiLimiter, subscriptionRoutes);
app.use('/api/notifications', generalApiLimiter, notificationRoutes);
app.use('/api/admin', generalApiLimiter, adminRoutes);
app.use('/api/reports', generalApiLimiter, reportRoutes);
app.use('/api', generalApiLimiter, courseManagementRoutes);
app.use('/api', generalApiLimiter, academicRoutes);
app.use('/api/chat', generalApiLimiter, chatRoutes);
app.use('/api/results', generalApiLimiter, resultRoutes);
app.use('/api/teacher', generalApiLimiter, teacherEvaluationRoutes);
app.use('/api', generalApiLimiter, groupRoutes);
app.use('/api', generalApiLimiter, reviewRoutes);
// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Examify API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use('*', (req, res) => {
  return sendError(res, 404, 'ROUTE_NOT_FOUND', 'Route not found');
});

// Global error handler
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 5000;
  httpServer.listen(PORT, () => {
    console.log(`
   
  ╔═══════════════════════════════════════╗
  ║       🎓 EXAMIFY SERVER RUNNING        ║
  ║  Port: ${PORT}                             ║
  ║  Mode: ${process.env.NODE_ENV || 'development'}                   ║
  ╚═══════════════════════════════════════╝
  `);
});
}

export default app;
