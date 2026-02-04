export const DEFAULT_SETTINGS = {
  mafiaCount: 1,
  doctor: true,
  detective: true,
};

export function normalizeRoomCode(code: string): string {
  return code.trim().toUpperCase();
}

export function sanitizeSettings(input: any) {
  return {
    mafiaCount: typeof input?.mafiaCount === 'number' ? Math.max(1, input.mafiaCount) : DEFAULT_SETTINGS.mafiaCount,
    doctor: typeof input?.doctor === 'boolean' ? input.doctor : DEFAULT_SETTINGS.doctor,
    detective: typeof input?.detective === 'boolean' ? input.detective : DEFAULT_SETTINGS.detective,
  };
}
