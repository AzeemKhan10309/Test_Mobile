/**
 * JWT Utility Functions
 */

import jwt from 'jsonwebtoken';

// ✅ Generate Access Token
export const generateAccessToken = (userId, role) => {
  const JWT_SECRET = process.env.JWT_SECRET;

  if (!JWT_SECRET) {
    throw new Error('Missing required JWT_SECRET environment variable');
  }

  return jwt.sign(
    { id: userId, role },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '15m' }
  );
};

// ✅ Generate Refresh Token
export const generateRefreshToken = (userId) => {
  const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

  if (!JWT_REFRESH_SECRET) {
    throw new Error('Missing required JWT_REFRESH_SECRET environment variable');
  }

  return jwt.sign(
    { id: userId },
    JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
  );
};

// ✅ Verify Access Token
export const verifyAccessToken = (token) => {
  const JWT_SECRET = process.env.JWT_SECRET;

  if (!JWT_SECRET) {
    throw new Error('Missing required JWT_SECRET environment variable');
  }

  return jwt.verify(token, JWT_SECRET);
};

// ✅ Verify Refresh Token
export const verifyRefreshToken = (token) => {
  const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

  if (!JWT_REFRESH_SECRET) {
    throw new Error('Missing required JWT_REFRESH_SECRET environment variable');
  }

  return jwt.verify(token, JWT_REFRESH_SECRET);
};

// ✅ Generate Token Pair
export const generateTokenPair = (userId, role) => ({
  accessToken: generateAccessToken(userId, role),
  refreshToken: generateRefreshToken(userId),
});