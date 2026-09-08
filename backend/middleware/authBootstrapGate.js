const parseAllowlist = () => (process.env.SUPERADMIN_BOOTSTRAP_IP_ALLOWLIST || '')
  .split(',')
  .map((ip) => ip.trim())
  .filter(Boolean);

const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip;
};

export const guardSuperadminBootstrap = (req, res, next) => {
  if (process.env.NODE_ENV !== 'production') return next();

  const providedSecret = req.headers['x-setup-secret'];
  const expectedSecret = process.env.SUPERADMIN_SETUP_SECRET;
  if (!expectedSecret || providedSecret !== expectedSecret) {
    return res.status(403).json({ success: false, message: 'Superadmin bootstrap is disabled' });
  }

  const allowlist = parseAllowlist();
  if (allowlist.length > 0) {
    const requestIp = getClientIp(req);
    if (!allowlist.includes(requestIp)) {
      return res.status(403).json({ success: false, message: 'IP not allowed for bootstrap' });
    }
  }

  return next();
};