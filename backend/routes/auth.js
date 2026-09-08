// routes/auth.js
import express from 'express';
import { registerStudent, registerTeacher, registerSuperadmin, login, refreshToken, logout, getMe, forgotPassword, resetPassword } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { authLimiter, refreshLimiter, loginLimiter, passwordResetLimiter } from '../middleware/rateLimiter.js';
import { initializeAuthProtection, enforceAuthProtection } from '../middleware/authProtection.js';
import { guardSuperadminBootstrap } from '../middleware/authBootstrapGate.js';
import {
  validateBody,
  registerStudentSchema,
  registerTeacherSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../middleware/validators.js';

const router = express.Router();

router.post('/register/student', authLimiter, validateBody(registerStudentSchema), registerStudent);
router.post('/register/teacher', authLimiter, validateBody(registerTeacherSchema), registerTeacher);
router.post('/register/superadmin', authLimiter, guardSuperadminBootstrap, registerSuperadmin);
router.post('/login', loginLimiter, initializeAuthProtection, enforceAuthProtection, validateBody(loginSchema), login);
router.post('/refresh', refreshLimiter, refreshToken);
router.post('/forgot-password', passwordResetLimiter, validateBody(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', passwordResetLimiter, validateBody(resetPasswordSchema), resetPassword);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);

export default router;
