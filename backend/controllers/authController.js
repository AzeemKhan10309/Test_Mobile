/**
 * Authentication Controller
 * Handles login, register, refresh token, logout
 */

import User from '../models/User.js';
import PasswordResetCode from '../models/PasswordResetCode.js';
import { generateTokenPair, verifyRefreshToken } from '../utils/jwt.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authSecurityService } from '../services/authSecurityService.js';
import bcrypt from 'bcryptjs';
const buildRefreshCookieConfig = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/api/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000,
});

const buildAccessCookieConfig = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/api',
  maxAge: 15 * 60 * 1000,
});
/**
 * POST /api/auth/register/student
 * Register a new student
 */
export const registerStudent = asyncHandler(async (req, res) => {
  const { name, studentId, password, gender, personalPhone, guardianPhone, area } = req.validatedBody || req.body;
  const normalizedName = typeof name === 'string' ? name.trim() : '';
  const normalizedStudentId = typeof studentId === 'string' ? studentId.trim().toUpperCase() : '';
  const normalizedGender = typeof gender === 'string' ? gender.toLowerCase().trim() : '';
const normalizedPersonalPhone = typeof personalPhone === 'string' ? personalPhone.trim() : '';
  const normalizedGuardianPhone = typeof guardianPhone === 'string' ? guardianPhone.trim() : '';
  const normalizedArea = typeof area === 'string' ? area.trim() : '';

  console.info('[auth.registerStudent] Processing student registration', {
    requestId: req.id,
    studentId: normalizedStudentId,
    hasName: Boolean(normalizedName),
    hasGender: Boolean(normalizedGender),
    hasPersonalPhone: Boolean(normalizedPersonalPhone),
    hasGuardianPhone: Boolean(normalizedGuardianPhone),
    hasArea: Boolean(normalizedArea),
  });

  const missingFields = [
    ['name', normalizedName],
    ['studentId', normalizedStudentId],
    ['gender', normalizedGender],
    ['password', password],
    ['personalPhone', normalizedPersonalPhone],
    ['guardianPhone', normalizedGuardianPhone],
    ['area', normalizedArea],
  ].filter(([, value]) => !value).map(([field]) => field);

  if (missingFields.length) {
    console.warn('[auth.registerStudent] Missing required fields', { requestId: req.id, studentId: normalizedStudentId, missingFields });
    return res.status(400).json({
      success: false,
      message: `Missing required field${missingFields.length > 1 ? 's' : ''}: ${missingFields.join(', ')}`,
      error: { code: 'MISSING_REQUIRED_FIELDS', details: { missingFields } },
    });
  }


  if (!['male', 'female'].includes(normalizedGender)) {
  console.warn('[auth.registerStudent] Invalid gender', { requestId: req.id, studentId: normalizedStudentId, gender });
    return res.status(400).json({ success: false, message: 'Gender must be male or female' });
  }
  const existingUser = await User.findOne({ studentId: normalizedStudentId });
    if (existingUser) {
   console.warn('[auth.registerStudent] Duplicate student ID', { requestId: req.id, studentId: normalizedStudentId });
    return res.status(409).json({ success: false, message: 'Student ID already registered' });
  }

  const user = await User.create({
     name: normalizedName,
    studentId: normalizedStudentId,
    password,
    gender: normalizedGender,
    personalPhone: normalizedPersonalPhone,
    guardianPhone: normalizedGuardianPhone,
    area: normalizedArea,
    role: 'student',

  });

  const tokens = generateTokenPair(user._id, user.role);
  user.refreshTokens = [tokens.refreshToken];
  user.lastLogin = new Date();
  await user.save();
  res.cookie('refreshToken', tokens.refreshToken, buildRefreshCookieConfig());
    res.cookie('accessToken', tokens.accessToken, buildAccessCookieConfig());
  res.status(201).json({
    success: true,
    message: 'Student registered successfully',
    data: {
      user: user.toSafeObject(),
      ...tokens,
            accessToken: tokens.accessToken,
    },
  });
});

/**
 * POST /api/auth/register/teacher
 * Register a new teacher
 */
export const registerTeacher = asyncHandler(async (req, res) => {
  const { name, email, password } = req.validatedBody || req.body;
const normalizedName = typeof name === 'string' ? name.trim() : '';
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!normalizedName || !normalizedEmail || !password) {

    return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
  }

  const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
    return res.status(409).json({ success: false, message: 'Email already registered' });
  }

  const user = await User.create({
       name: normalizedName,
    email: normalizedEmail,
    password,
    role: 'teacher',
  });

  const tokens = generateTokenPair(user._id, user.role);
  user.refreshTokens = [tokens.refreshToken];
  user.lastLogin = new Date();
  await user.save();
  res.cookie('refreshToken', tokens.refreshToken, buildRefreshCookieConfig());
    res.cookie('accessToken', tokens.accessToken, buildAccessCookieConfig());
  res.status(201).json({
    success: true,
    message: 'Teacher registered successfully',
    data: {
      user: user.toSafeObject(),
      accessToken: tokens.accessToken,
        },
  });
});

/**
 * POST /api/auth/login
 * Login for all roles
 */
export const login = asyncHandler(async (req, res) => {
  const { email, studentId, password } = req.validatedBody || req.body;
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const normalizedStudentId = typeof studentId === 'string' ? studentId.trim().toUpperCase() : '';
  const protection = req.authProtection || {};
  if (!password) {
    return res.status(400).json({ success: false, message: 'Password is required' });
  }
  if (!normalizedEmail && !normalizedStudentId) {
        return res.status(400).json({ success: false, message: 'Email or Student ID is required' });
  }
  const invalidCredentialResponse = async () => {
    if (protection.keys) {
      await authSecurityService.recordFailure({
        ip: protection.ip,
        identifier: protection.identifier,
        keys: protection.keys,
      });
    }

    return res.status(401).json({ success: false, message: 'Invalid email or password.' });
  };
  // Find user
  let user;
   if (normalizedStudentId) {
    user = await User.findOne({ studentId: normalizedStudentId }).select('+password +refreshTokens');
   }else {
    user = await User.findOne({ email: normalizedEmail }).select('+password +refreshTokens');
    }

if (!user || !user.isActive) {
    return invalidCredentialResponse();
  }

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    return invalidCredentialResponse();  }

  const tokens = generateTokenPair(user._id, user.role);

  // Keep last 5 refresh tokens
  user.refreshTokens = [...(user.refreshTokens || []).slice(-4), tokens.refreshToken];
  user.lastLogin = new Date();
  await user.save();
    res.cookie('refreshToken', tokens.refreshToken, buildRefreshCookieConfig());
      res.cookie('accessToken', tokens.accessToken, buildAccessCookieConfig());
 if (protection.keys) {
    await authSecurityService.recordSuccess({ keys: protection.keys });
  }

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: user.toSafeObject(),
      accessToken: tokens.accessToken,
        },
  });
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
export const refreshToken = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
    if (!token) {
    return res.status(400).json({ success: false, message: 'Refresh token required' });
  }
 

  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
  }

  const user = await User.findById(decoded.id).select('+refreshTokens');
  if (!user || !(user.refreshTokens || []).includes(token)) {
    return res.status(401).json({ success: false, message: 'Refresh token not recognized' });
  }

  const tokens = generateTokenPair(user._id, user.role);
  user.refreshTokens = [...user.refreshTokens.filter((t) => t !== token), tokens.refreshToken];
  await user.save();
  res.cookie('refreshToken', tokens.refreshToken, buildRefreshCookieConfig());
    res.cookie('accessToken', tokens.accessToken, buildAccessCookieConfig());
  res.json({
    success: true,
    data: { accessToken: tokens.accessToken },
    });
});

/**
 * POST /api/auth/logout
 * Logout and invalidate refresh token
 */
export const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
    if (req.user && token) {
    const user = await User.findById(req.user._id).select('+refreshTokens');
    if (user) {
      user.refreshTokens = (user.refreshTokens || []).filter((t) => t !== token);
      await user.save();
    }
  }
res.clearCookie('refreshToken', buildRefreshCookieConfig());
  res.clearCookie('accessToken', buildAccessCookieConfig());
  res.json({ success: true, message: 'Logged out successfully' });
});

/**
 * GET /api/auth/me
 * Get current user profile
 */
export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  res.json({ success: true, data: user.toSafeObject() });
});

/**
 * POST /api/auth/forgot-password
 * Forgot password (studentId + temporary code)
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  const { studentId, email } = req.validatedBody || req.body;
    const normalizedStudentId = typeof studentId === 'string' ? studentId.trim().toUpperCase() : '';
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

if (!normalizedStudentId && !normalizedEmail) {
    return res.status(400).json({ success: false, message: 'Email or Student ID is required' });
  }

 const userQuery = normalizedStudentId
    ? { studentId: normalizedStudentId, role: 'student' }
    : { email: normalizedEmail, role: 'teacher' };

  const user = await User.findOne(userQuery).select('_id studentId email role');
  if (!user) {
       return res.status(404).json({ success: false, message: 'User not found' });
  }

  const resetCode = String(Math.floor(100000 + Math.random() * 900000));
  const hashedCode = await bcrypt.hash(resetCode, 12);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  const resetKey = user.role === 'student' ? user.studentId : user.email.toUpperCase();
  await PasswordResetCode.findOneAndUpdate(
       { studentId: resetKey },
    { $set: { hashedCode, expiresAt, attempts: 0 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  res.json({
    success: true,
    message: 'Reset code generated successfully',
    data: {
      studentId: user.role === 'student' ? user.studentId : undefined,
      email: user.role === 'teacher' ? user.email : undefined,
      code: resetCode,
      expiresInSeconds: 300,
    },
  });
});

/**
 * POST /api/auth/reset-password
 * Reset password with a temporary 6-digit code
 */
export const resetPassword = asyncHandler(async (req, res) => {
    const { studentId, email, code, newPassword } = req.validatedBody || req.body;
  const normalizedStudentId = typeof studentId === 'string' ? studentId.trim().toUpperCase() : '';
const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  const userQuery = normalizedStudentId
    ? { studentId: normalizedStudentId, role: 'student' }
    : { email: normalizedEmail, role: 'teacher' };
  const user = await User.findOne(userQuery).select('+password studentId email role');
    if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
    }

const resetKey = user.role === 'student' ? user.studentId : user.email.toUpperCase();
  const resetRecord = await PasswordResetCode.findOne({ studentId: resetKey }).select('+hashedCode');
    if (!resetRecord) {
    return res.status(400).json({ success: false, message: 'No active reset request found' });
  }

  if (resetRecord.attempts >= 3) {
    await PasswordResetCode.deleteOne({ _id: resetRecord._id });
    return res.status(429).json({ success: false, message: 'Maximum verification attempts exceeded. Request a new code.' });
  }

  if (resetRecord.expiresAt.getTime() < Date.now()) {
    await PasswordResetCode.deleteOne({ _id: resetRecord._id });
    return res.status(400).json({ success: false, message: 'Reset code has expired' });
  }

  const isCodeValid = await bcrypt.compare(String(code), resetRecord.hashedCode);
  if (!isCodeValid) {
    await PasswordResetCode.updateOne({ _id: resetRecord._id }, { $inc: { attempts: 1 } });
    return res.status(400).json({ success: false, message: 'Invalid reset code' });
  }

  user.password = newPassword;
  await user.save();
  await PasswordResetCode.deleteOne({ _id: resetRecord._id });

  res.json({ success: true, message: 'Password has been reset successfully' });
});

export const registerSuperadmin = asyncHandler(async (req, res) => {
  const { name, email, password } = req.validatedBody || req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
  }

  const existingSuperadmin = await User.countDocuments({ role: 'superadmin' });
  if (existingSuperadmin > 0) {
    return res.status(403).json({ success: false, message: 'Superadmin already exists. Please login with an existing admin account.' });
  }

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    return res.status(409).json({ success: false, message: 'Email already registered' });
  }

  const user = await User.create({
    name,
    email: email.toLowerCase(),
    password,
    role: 'superadmin',
    isEmailVerified: true,
  });

  const tokens = generateTokenPair(user._id, user.role);
  user.refreshTokens = [tokens.refreshToken];
  user.lastLogin = new Date();
  await user.save();

  res.status(201).json({
    success: true,
    message: 'Superadmin registered successfully',
    data: {
      user: user.toSafeObject(),
      accessToken: tokens.accessToken,
        },
  });
});
