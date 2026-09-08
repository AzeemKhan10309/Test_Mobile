/**
 * Socket.io Manager
 * Real-time communication for live exam monitoring
 */

import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Course from '../models/Course.js';
import GroupMember from '../models/GroupMember.js';
import Test from '../models/Test.js';
import Submission from '../models/Submission.js';
// Track active connections
const activeStudents = new Map();
const submittedStudents = new Map();
const onlineUsers = new Map();

export const initSocket = (httpServer) => {
  // ✅ ENV LOAD AFTER DOTENV
  const JWT_SECRET = process.env.JWT_SECRET;

  if (!JWT_SECRET) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Missing required JWT_SECRET environment variable for socket authentication');
    }
    console.warn('[socket] JWT_SECRET missing - socket authentication disabled in non-production mode.');
    return new Server(httpServer, {
      cors: { origin: true, methods: ['GET', 'POST'], credentials: true },
      transports: ['websocket', 'polling'],
    });
  }

  // ✅ MOVE ENV-BASED CONFIG HERE
  const socketAllowedOrigins = new Set([
    'http://localhost:5173',
        'http://127.0.0.1:5173',
    process.env.FRONTEND_URL,
    ...(process.env.CORS_ORIGINS || '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  ].filter(Boolean));
  const socketAllowedOriginPatterns = [
    /^https:\/\/[a-z0-9-]+\.vercel\.app$/i,
    ...(process.env.CORS_ORIGIN_REGEX || '')
      .split(',')
      .map((pattern) => pattern.trim())
      .filter(Boolean)
      .flatMap((pattern) => {
        try {
          return [new RegExp(pattern)];
        } catch (error) {
          console.warn(`Ignoring invalid CORS_ORIGIN_REGEX pattern for sockets: ${pattern}`, error.message);
          return [];
        }
      }),
  ];
  const isSocketOriginAllowed = (origin = '') => {
    if (!origin) return true;
    if (socketAllowedOrigins.has(origin)) return true;
    return socketAllowedOriginPatterns.some((pattern) => pattern.test(origin));
  };

  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (isSocketOriginAllowed(origin)) return callback(null, true);
        return callback(new Error(`Socket CORS blocked for origin: ${origin}`));
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // 🔐 Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('No token'));

      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.id).select('name role studentId email');
      if (!user) return next(new Error('User not found'));

      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Authentication failed'));
    }
  });

  // 📊 Live stats interval
  const liveStatusInterval = setInterval(() => {
    io.emit('live-status', {
      activeStudents: activeStudents.size,
      submittedStudents: [...submittedStudents.values()].reduce((sum, set) => sum + set.size, 0),
    });
  }, 2000);

  // 🔌 Connection handler
  io.on('connection', (socket) => {
    const user = socket.user;
    const userId = user._id.toString();

    console.log(`🔌 Socket connected: ${user.name} (${user.role})`);

    socket.join(`user:${user._id}`);
    if (user.role === 'teacher') socket.join(`teacher:${user._id}`);
    if (user.role === 'student') socket.join(`student:${user._id}`);

    onlineUsers.set(userId, (onlineUsers.get(userId) || 0) + 1);

    // Courses + Groups
    if (user.role === 'teacher' || user.role === 'superadmin') {
      Course.find({ teacher: user._id }).select('_id').lean()
        .then((courses) => courses.forEach((c) => socket.join(`course:${c._id}`)))
        .catch(() => {});

      GroupMember.find({ userId: user._id, status: 'active' }).select('groupId').lean()
        .then((groups) => {
          groups.forEach((g) => socket.join(`group:${g.groupId}`));
          groups.forEach((g) => {
            io.to(`group:${g.groupId}`).emit('group:presence', { userId, status: 'online' });
          });
        })
        .catch(() => {});
    }

    if (user.role === 'student') {
      Course.find({ students: user._id }).select('_id').lean()
        .then((courses) => courses.forEach((c) => socket.join(`course:${c._id}`)))
        .catch(() => {});
    }

    // ================= TEACHER =================
    if (user.role === 'teacher' || user.role === 'superadmin') {

            socket.on('watch_test', async (testId) => {
        const id = String(testId);
        const test = await Test.findOne({ _id: id, createdBy: user._id }).select('_id');
        if (!test) return socket.emit('socket_error', { message: 'Unauthorized test monitor request' });
        socket.join(`monitor:${id}`);
        socket.join(id);

        const students = [...activeStudents.values()]
          .filter((s) => String(s.testId) === id)
          .map(({ socket: _s, ...rest }) => rest);

        socket.emit('active_students', students);
      });

      socket.on('force_submit_student', async ({ studentId, testId }) => {
        const ownedTest = await Test.findOne({ _id: testId, createdBy: user._id }).select('_id');
        if (!ownedTest) return socket.emit('socket_error', { message: 'Unauthorized force submit' });
        io.to(`student:${studentId}`).emit('force_submitted', { testId });
      });

      socket.on('send_warning', async ({ studentId, message, testId }) => {
        const ownedTest = await Test.findOne({ _id: testId, createdBy: user._id }).select('_id');
        if (!ownedTest) return socket.emit('socket_error', { message: 'Unauthorized warning event' });
        io.to(`student:${studentId}`).emit('teacher_warning', { message });
      });
    }

    // ================= STUDENT =================
    if (user.role === 'student') {

      socket.on('join_exam', ({ testId, submissionId }) => {
        const tId = String(testId);
        const sId = String(submissionId);
        if (!tId || !sId) return;

        socket.join(`monitor:${tId}`);
        socket.join(tId);

        const data = {
          submissionId: sId,
          studentId: userId,
          testId: tId,
          name: user.name,
          joinedAt: new Date(),
          status: 'active',
          violations: 0,
        };

        activeStudents.set(sId, { ...data, socket: socket.id });

        io.to(`monitor:${tId}`).emit('student_joined', data);
        io.to(tId).emit('student-joined', data);
      });

      socket.on('exam_submitted', ({ submissionId, testId }) => {
        activeStudents.delete(submissionId);

        if (!submittedStudents.has(String(testId))) {
          submittedStudents.set(String(testId), new Set());
        }

        submittedStudents.get(String(testId)).add(userId);

        io.to(`monitor:${testId}`).emit('student_submitted', {
          submissionId,
          studentId: userId,
          name: user.name,
        });
      });
          socket.on('heartbeat', async ({ submissionId, remainingTime }) => {
        const submission = await Submission.findOne({ _id: submissionId, student: user._id, status: 'in_progress' }).select('_id test');
        if (!submission) return;
        io.to(String(submission.test)).emit('student-heartbeat', {
          submissionId: String(submissionId),
          studentId: userId,
          remainingTime,
          at: new Date().toISOString(),
        });
      });
    }

    // ================= DISCONNECT =================
    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${user.name}`);
    });
  });

  io.engine.on('close', () => {
    clearInterval(liveStatusInterval);
  });

  return io;
};