/**
 * Auth protection service for layered login controls.
 */

import cache from '../config/redis.js';
import { sendSecurityAlert } from './alertService.js';

const WINDOW_SECONDS = 15 * 60;
const TEMP_BLOCK_SECONDS = 15 * 60;
// Raised to support real classrooms where many users share one NAT IP.
const IP_LIMIT_MAX = 1200;
const ACCOUNT_FAILED_LIMIT = 10;
const IP_ACCOUNT_FAILED_LIMIT = 25;

const DELAY_RULES = [
  { attempts: 10, seconds: TEMP_BLOCK_SECONDS, block: true },
  { attempts: 7, seconds: 30, block: false },
  { attempts: 5, seconds: 15, block: false },
  { attempts: 3, seconds: 5, block: false },
];

const jsonParseSafe = (value, fallback) => {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const getCounter = async (key) => {
  const value = await cache.get(key);
  return Number(value || 0);
};

const setCounter = async (key, value, ttl = WINDOW_SECONDS) => {
  await cache.set(key, String(value), { EX: ttl });
};

const incrementCounter = async (key, ttl = WINDOW_SECONDS) => {
  const currentValue = await getCounter(key);
  const nextValue = currentValue + 1;
  await setCounter(key, nextValue, ttl);
  return nextValue;
};

const getTtl = async (key) => {
  const ttl = await cache.ttl(key);
  return ttl > 0 ? ttl : WINDOW_SECONDS;
};

const buildKeys = ({ ip, identifier }) => {
  const safeIdentifier = (identifier || 'unknown').toLowerCase();
  return {
    ipTotal: `auth:ip:total:${ip}`,
    accountFailed: `auth:account:failed:${safeIdentifier}`,
    ipAccountFailed: `auth:ip_account:failed:${ip}:${safeIdentifier}`,
    accountDelay: `auth:account:delay:${safeIdentifier}`,
    accountBlock: `auth:account:block:${safeIdentifier}`,
    ipSpikeLog: `auth:ip:timeline:${ip}`,
  };
};

const getDelaySeconds = (failedAttempts) => {
  const matchedRule = DELAY_RULES.find((rule) => failedAttempts >= rule.attempts && !rule.block);
  return matchedRule ? matchedRule.seconds : 0;
};

const pushIpFailureLog = async ({ keys, ip, identifier }) => {
  const now = Date.now();
  const raw = await cache.get(keys.ipSpikeLog);
  const timeline = jsonParseSafe(raw, []);
  const windowStart = now - WINDOW_SECONDS * 1000;
  const nextTimeline = [...timeline.filter((item) => item >= windowStart), now];

  await cache.set(keys.ipSpikeLog, JSON.stringify(nextTimeline), { EX: WINDOW_SECONDS });

  if (nextTimeline.length >= 50) {
    const alertPayload = {
      type: 'AUTH_SPIKE',
      message: 'Suspicious authentication failure spike detected',
      ip,
      identifier,
      failedEventsInWindow: nextTimeline.length,
      windowSeconds: WINDOW_SECONDS,
      timestamp: new Date(now).toISOString(),
    };

    console.warn('Suspicious auth spike:', alertPayload);
    await sendSecurityAlert(alertPayload);
  }
};

export const authSecurityService = {
  getIdentifier(payload = {}) {
    if (payload.email && typeof payload.email === 'string') {
      return payload.email.trim().toLowerCase();
    }

    if (payload.studentId && typeof payload.studentId === 'string') {
      return payload.studentId.trim().toUpperCase();
    }

    return '';
  },

  async getPreCheckState({ ip, identifier }) {
    const keys = buildKeys({ ip, identifier });

    const [
      ipTotalCount,
      accountFailedCount,
      ipAccountFailedCount,
      blockExists,
      delayUntilRaw,
      ipTotalTtl,
      accountTtl,
      ipAccountTtl,
      blockTtl,
    ] = await Promise.all([
      getCounter(keys.ipTotal),
      getCounter(keys.accountFailed),
      getCounter(keys.ipAccountFailed),
      cache.exists(keys.accountBlock),
      cache.get(keys.accountDelay),
      getTtl(keys.ipTotal),
      getTtl(keys.accountFailed),
      getTtl(keys.ipAccountFailed),
      getTtl(keys.accountBlock),
    ]);

    const delayUntil = Number(delayUntilRaw || 0);
    const delaySeconds = delayUntil > Date.now() ? Math.ceil((delayUntil - Date.now()) / 1000) : 0;

    return {
      keys,
      counters: {
        ipTotalCount,
        accountFailedCount,
        ipAccountFailedCount,
      },
      ttl: {
        ipTotalTtl,
        accountTtl,
        ipAccountTtl,
        blockTtl,
      },
      isBlocked: blockExists === 1,
      delaySeconds,
      ipLimitExceeded: ipTotalCount >= IP_LIMIT_MAX,
      accountLimitExceeded: accountFailedCount >= ACCOUNT_FAILED_LIMIT,
      ipAccountLimitExceeded: ipAccountFailedCount >= IP_ACCOUNT_FAILED_LIMIT,
    };
  },

  async recordRequest({ keys }) {
    // Keep legacy method for compatibility, but do not increment on every request.
    // Incrementing here caused valid high-concurrency exam logins to be throttled.
    return keys;
  },

  async recordFailure({ ip, identifier, keys }) {
    const [ipTotalCount, accountFailedCount, ipAccountFailedCount] = await Promise.all([
      incrementCounter(keys.ipTotal),
      incrementCounter(keys.accountFailed),
      incrementCounter(keys.ipAccountFailed),
    ]);

    const maxFailed = Math.max(accountFailedCount, ipAccountFailedCount);

    if (maxFailed >= 10) {
      await cache.set(keys.accountBlock, '1', { EX: TEMP_BLOCK_SECONDS });
      await cache.del(keys.accountDelay);
    } else {
      const delaySeconds = getDelaySeconds(maxFailed);
      if (delaySeconds > 0) {
        const delayUntil = Date.now() + delaySeconds * 1000;
        await cache.set(keys.accountDelay, String(delayUntil), { EX: WINDOW_SECONDS });
      }
    }

    await pushIpFailureLog({ keys, ip, identifier });

    return {
      ipTotalCount,
      accountFailedCount,
      ipAccountFailedCount,
      maxFailed,
    };
  },

  async recordSuccess({ keys }) {
    await Promise.all([
      cache.del(keys.accountFailed),
      cache.del(keys.ipAccountFailed),
      cache.del(keys.accountDelay),
      cache.del(keys.accountBlock),
    ]);
  },
};

export {
  WINDOW_SECONDS,
  TEMP_BLOCK_SECONDS,
  IP_LIMIT_MAX,
  ACCOUNT_FAILED_LIMIT,
  IP_ACCOUNT_FAILED_LIMIT,
};
