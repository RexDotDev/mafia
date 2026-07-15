import { normalizeRoundState } from './roundState.js';

export const DEFAULT_SETTINGS = {
  mafiaCount: 1,
  doctor: true,
  detective: true,
  lady: false,
  casualMode: false,
  customRoles: [] as { name: string; count: number }[],
  roundState: null as any,
};

export const MAX_PLAYERS_PER_ROOM = 20;

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
    const count =
      typeof raw?.count === 'number' && Number.isFinite(raw.count)
        ? Math.max(1, Math.min(10, Math.floor(raw.count)))
        : 1;
    roles.push({ name: name.slice(0, 24), count });
    if (roles.length >= 10) break;
  }
  return roles;
};

export function sanitizeSettings(input: any) {
  const normalizedRoundState = normalizeRoundState(input?.roundState);
  const hasRoundState =
    normalizedRoundState.round > 0 ||
    normalizedRoundState.events.length > 0 ||
    normalizedRoundState.actions.length > 0 ||
    normalizedRoundState.votes.length > 0 ||
    normalizedRoundState.eliminatedPlayerIds.length > 0 ||
    normalizedRoundState.graveyardMessages.length > 0 ||
    normalizedRoundState.mafiaMessages.length > 0 ||
    normalizedRoundState.phase !== 'idle' ||
    normalizedRoundState.lastResult !== null ||
    normalizedRoundState.lastVoteSummary !== null ||
    normalizedRoundState.gameResult !== null;

  return {
    mafiaCount:
      typeof input?.mafiaCount === 'number' && Number.isFinite(input.mafiaCount)
        ? Math.max(1, Math.min(10, Math.floor(input.mafiaCount)))
        : DEFAULT_SETTINGS.mafiaCount,
    doctor: true,
    detective: true,
    lady: typeof input?.lady === 'boolean' ? input.lady : DEFAULT_SETTINGS.lady,
    casualMode: typeof input?.casualMode === 'boolean' ? input.casualMode : DEFAULT_SETTINGS.casualMode,
    customRoles: sanitizeCustomRoles(input?.customRoles),
    roundState: hasRoundState ? normalizedRoundState : null,
  };
}
