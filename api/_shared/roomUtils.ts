export const DEFAULT_SETTINGS = {
  mafiaCount: 1,
  doctor: true,
  detective: true,
  lady: false,
  customRoles: [] as { name: string; count: number }[],
};

export function normalizeRoomCode(code: string): string {
  return code.trim().toUpperCase();
}

const sanitizeCustomRoles = (input: any) => {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const roles: { name: string; count: number }[] = [];
  for (const raw of input) {
    const name = typeof raw?.name === 'string' ? raw.name.trim() : '';
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const count = typeof raw?.count === 'number' ? Math.max(1, Math.min(10, raw.count)) : 1;
    roles.push({ name: name.slice(0, 24), count });
    if (roles.length >= 10) break;
  }
  return roles;
};

export function sanitizeSettings(input: any) {
  return {
    mafiaCount: typeof input?.mafiaCount === 'number' ? Math.max(1, input.mafiaCount) : DEFAULT_SETTINGS.mafiaCount,
    doctor: true,
    detective: true,
    lady: typeof input?.lady === 'boolean' ? input.lady : DEFAULT_SETTINGS.lady,
    customRoles: sanitizeCustomRoles(input?.customRoles),
  };
}
