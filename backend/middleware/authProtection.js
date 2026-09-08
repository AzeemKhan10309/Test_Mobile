/**
 * Middleware stack for layered auth protection.
 */

import { authSecurityService } from '../services/authSecurityService.js';

const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }

  return req.ip || req.connection?.remoteAddress || 'unknown';
};

export const initializeAuthProtection = async (req, res, next) => {
  const ip = getClientIp(req);
  const identifier = authSecurityService.getIdentifier(req.body);

  if (!identifier) {
    return res.status(400).json({ success: false, message: 'Email or Student ID is required' });
  }

  const state = await authSecurityService.getPreCheckState({ ip, identifier });

  req.authProtection = {
    ip,
    identifier,
    keys: state.keys,
    state,
  };

  await authSecurityService.recordRequest({ keys: state.keys });

  return next();
};

export const enforceAuthProtection = async (req, res, next) => {
  const protection = req.authProtection;
  if (!protection) {
    return next();
  }

  const { state } = protection;

  if (state.ipLimitExceeded) {
    return res.status(429).json({
      success: false,
      code: 'AUTH_RATE_LIMITED_IP',
      message: 'High failed-login volume detected. Please wait before retrying.',
      retryAfterSec: state.ttl?.ipTotalTtl || 60,
    });
  }

  if (state.isBlocked || state.accountLimitExceeded || state.ipAccountLimitExceeded) {
    return res.status(429).json({
      success: false,
      code: 'AUTH_RATE_LIMITED_ACCOUNT',
      message: 'Too many failed login attempts for this account. Please wait and try again.',
      retryAfterSec: Math.max(state.ttl?.accountTtl || 60, state.ttl?.ipAccountTtl || 60, state.ttl?.blockTtl || 60),
    });
  }

  if (state.delaySeconds > 0) {
    return res.status(429).json({ success: false, message: `Please wait ${state.delaySeconds} seconds before retrying.` });
  }


  return next();
};
