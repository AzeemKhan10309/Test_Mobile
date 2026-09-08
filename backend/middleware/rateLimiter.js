/**
 * Rate Limiter Middleware
 */

import rateLimit from 'express-rate-limit';

const buildRetryMeta = (req, options = {}) => {
  const retryAfterSec = Math.max(1, Math.ceil((options.windowMs || 60_000) / 1000));
  return {
    success: false,
    code: 'RATE_LIMITED',
    message: 'Request rate limit reached. Please retry shortly.',
    retryAfterSec,
    path: req.originalUrl,
    requestId: req.id,
  };
};

const standardRateLimitHandler = (req, res, _next, options = {}) => {
  return res.status(429).json(buildRetryMeta(req, options));
};

const userOrIpKeyGenerator = (req) => req.user?._id?.toString() || req.ip;

/**
 * General API limiter for non-critical routes.
 * Kept permissive so normal traffic is not blocked in exam windows.
 */
export const generalApiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 300,
  keyGenerator: userOrIpKeyGenerator,
  handler: standardRateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: true,
});

/**
 * Login limiter intentionally high to support many students behind the same NAT IP.
 * Uses identifier+IP key when available to avoid shared-IP false positives.
 */
export const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 250,
  keyGenerator: (req) => {
    const identifier = String(req.body?.email || req.body?.studentId || '').trim().toLowerCase();
    return identifier ? `${req.ip}:${identifier}` : req.ip;
  },
  skipSuccessfulRequests: true,
  handler: standardRateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: true,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 40,
  handler: standardRateLimitHandler,
  skipSuccessfulRequests: true,
  passOnStoreError: true,
});

export const passwordResetLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 8,
  keyGenerator: (req) => {
    const studentId = String(req.body?.studentId || '').trim().toUpperCase();
    return studentId ? `${req.ip}:${studentId}` : req.ip;
  },
  handler: standardRateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: true,
});

export const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: { success: false, message: 'AI request limit reached. Please wait.' },
});
export const refreshLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 15,
  handler: standardRateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: true,
});

export const cheatingFlagLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  keyGenerator: (req) => `${req.user?._id}:${req.params.submissionId}`,
  handler: standardRateLimitHandler,
  passOnStoreError: true,
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Save-answer endpoint can fire frequently due to autosave.
 */
export const saveAnswersLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 600,
  keyGenerator: userOrIpKeyGenerator,
  handler: standardRateLimitHandler,
  passOnStoreError: true,
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Final submit endpoint: high burst allowance for concurrent exam endings.
 */
export const submitLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 240,
  keyGenerator: userOrIpKeyGenerator,
  handler: standardRateLimitHandler,
  passOnStoreError: true,
  standardHeaders: true,
  legacyHeaders: false,
});
