const ADMIN_ROLE_ALIASES = new Set(['superadmin', 'admin', 'super_admin', 'super-admin']);

export const normalizeRole = (role) => {
  const normalized = String(role || '').trim().toLowerCase();
  if (!normalized) return '';
  if (ADMIN_ROLE_ALIASES.has(normalized)) return 'superadmin';
  return normalized;
};