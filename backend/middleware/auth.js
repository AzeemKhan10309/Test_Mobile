/**
 * Authentication Middleware
 * JWT verification and role-based access control
 */

import { verifyAccessToken } from '../utils/jwt.js';
import User from '../models/User.js';
import { normalizeRole } from '../utils/roles.js';
import { sendError } from '../utils/apiResponse.js';

/**
 * Verify JWT access token
 */
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    const fallbackToken = req.headers['x-access-token'];
const cookieToken = req.cookies?.accessToken;
    const bearerToken = typeof authHeader === 'string' && /^bearer\s+/i.test(authHeader)
      ? authHeader.replace(/^bearer\s+/i, '').trim()
      : null;
    const token = bearerToken || fallbackToken || cookieToken;
    if (!token) {
      return sendError(res, 401, 'AUTH_TOKEN_MISSING', 'No token provided');
    }

    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.id).select('-password -refreshTokens');
    if (!user) {
      return sendError(res, 401, 'AUTH_USER_NOT_FOUND', 'User not found');
    }
    if (!user.isActive) {
      return sendError(res, 401, 'AUTH_ACCOUNT_DEACTIVATED', 'Account is deactivated');
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return sendError(res, 401, 'TOKEN_EXPIRED', 'Token expired');
    }
    return sendError(res, 401, 'AUTH_INVALID_TOKEN', 'Invalid token');
  }
};

/**
 * Role-based authorization
 * Usage: authorize('teacher', 'superadmin')
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 401, 'AUTH_NOT_AUTHENTICATED', 'Not authenticated');
    }
    const normalizedUserRole = normalizeRole(req.user.role);
    const normalizedAllowedRoles = roles.map((role) => normalizeRole(role));
    if (!normalizedAllowedRoles.includes(normalizedUserRole)) {
      return sendError(res, 403, 'AUTH_FORBIDDEN', 'Forbidden: insufficient permissions');
    }
    next();
  };
};

/**
 * Optional authentication - doesn't fail if no token
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return next();
    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.id).select('-password -refreshTokens');
    if (user && user.isActive) req.user = user;
  } catch (_) {
    // Silently fail
  }
  next();
};


export const authorizeExact = (...roles) => {
  const allowed = roles.map((role) => String(role || '').trim().toLowerCase());
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 401, 'AUTH_NOT_AUTHENTICATED', 'Not authenticated');
    }
    const userRole = String(req.user.role || '').trim().toLowerCase();
    if (!allowed.includes(userRole)) {
      return sendError(res, 403, 'AUTH_FORBIDDEN', 'Forbidden: insufficient permissions');
    }
    next();
  };
};
