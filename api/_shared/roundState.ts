import { Role } from '../../types.js';

const nowIso = () => new Date().toISOString();

const asString = (value: any) => (typeof value === 'string' ? value : '');

const asStringArray = (value: any) => (Array.isArray(value) ? value.filter((item) => typeof item === 'string') : []);
const asSafeNumber = (value: any) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;

const allowedPhases = new Set(['idle', 'night', 'voting']);
const allowedActionTypes = new Set(['mafia_kill', 'doctor_heal', 'detective_check', 'lady_silence']);
const allowedEventTypes = new Set([
  'round_started',
  'mafia_kill',
  'doctor_heal',
  'detective_check',
  'lady_silence',
  'vote_elimination',
  'note',
]);

export const createDefaultRoundResult = () => ({
  mafiaTargetId: null,
  killedPlayerId: null,
  doctorTargetId: null,
  doctorSaved: false,
  ladyTargetId: null,
  inspectorTargetId: null,
  inspectorIsMafia: null,
  mutedPlayerId: null,
});

export const createDefaultRoundState = () => ({
  round: 0,
  phase: 'idle',
  actions: [] as any[],
  votes: [] as any[],
  events: [] as any[],
  eliminatedPlayerIds: [] as string[],
  lastResult: null as any,
  lastVoteSummary: null as any,
  gameResult: null as any,
  graveyardMessages: [] as any[],
});

export const normalizeRoundState = (input: any) => {
  const fallback = createDefaultRoundState();
  if (!input || typeof input !== 'object') return fallback;

  const actions = Array.isArray(input.actions)
    ? input.actions
        .map((action: any) => ({
          actorId: asString(action?.actorId),
          actorName: asString(action?.actorName),
          role: asString(action?.role),
          type: allowedActionTypes.has(action?.type) ? action.type : '',
          targetId: asString(action?.targetId),
          targetName: asString(action?.targetName),
          createdAt: asString(action?.createdAt) || nowIso(),
        }))
        .filter((action: any) => action.actorId && action.targetId && action.type)
    : [];

  const events = Array.isArray(input.events)
    ? input.events
        .map((event: any) => ({
          id: asString(event?.id) || (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)),
          round: typeof event?.round === 'number' ? Math.max(0, event.round) : 0,
          type: allowedEventTypes.has(event?.type) ? event.type : 'note',
          message: asString(event?.message),
          createdAt: asString(event?.createdAt) || nowIso(),
        }))
        .filter((event: any) => event.message)
    : [];

  const votes = Array.isArray(input.votes)
    ? input.votes
        .map((vote: any) => ({
          voterId: asString(vote?.voterId),
          voterName: asString(vote?.voterName),
          targetId: asString(vote?.targetId),
          targetName: asString(vote?.targetName),
          createdAt: asString(vote?.createdAt) || nowIso(),
        }))
        .filter((vote: any) => vote.voterId && vote.targetId)
    : [];

  const rawResult = input.lastResult;
  const lastResult =
    rawResult && typeof rawResult === 'object'
      ? {
          mafiaTargetId: rawResult.mafiaTargetId ?? null,
          killedPlayerId: rawResult.killedPlayerId ?? null,
          doctorTargetId: rawResult.doctorTargetId ?? null,
          doctorSaved: !!rawResult.doctorSaved,
          ladyTargetId: rawResult.ladyTargetId ?? null,
          inspectorTargetId: rawResult.inspectorTargetId ?? null,
          inspectorIsMafia:
            typeof rawResult.inspectorIsMafia === 'boolean' ? rawResult.inspectorIsMafia : null,
          mutedPlayerId: rawResult.mutedPlayerId ?? null,
        }
      : null;

  const graveyardMessages = Array.isArray(input.graveyardMessages)
    ? input.graveyardMessages
        .map((message: any) => ({
          id: asString(message?.id) || (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)),
          senderId: asString(message?.senderId),
          senderName: asString(message?.senderName),
          message: asString(message?.message).slice(0, 800),
          createdAt: asString(message?.createdAt) || nowIso(),
        }))
        .filter((message: any) => message.senderId && message.senderName && message.message)
        .slice(-200)
    : [];

  const rawVoteSummary = input.lastVoteSummary;
  const lastVoteSummary =
    rawVoteSummary && typeof rawVoteSummary === 'object'
      ? {
          totalVoters: asSafeNumber(rawVoteSummary.totalVoters),
          completedVoters: asSafeNumber(rawVoteSummary.completedVoters),
          eliminatedPlayerId: typeof rawVoteSummary.eliminatedPlayerId === 'string' ? rawVoteSummary.eliminatedPlayerId : null,
          eliminatedPlayerName:
            typeof rawVoteSummary.eliminatedPlayerName === 'string' ? rawVoteSummary.eliminatedPlayerName : null,
          voteCounts: Array.isArray(rawVoteSummary.voteCounts)
            ? rawVoteSummary.voteCounts
                .map((entry: any) => ({
                  playerId: asString(entry?.playerId),
                  playerName: asString(entry?.playerName),
                  votes: asSafeNumber(entry?.votes),
                }))
                .filter((entry: any) => entry.playerId)
            : [],
        }
      : null;

  const rawGameResult = input.gameResult;
  const gameResult =
    rawGameResult && typeof rawGameResult === 'object'
      ? {
          winner: rawGameResult.winner === 'city' || rawGameResult.winner === 'mafia' ? rawGameResult.winner : null,
          message: asString(rawGameResult.message),
          round: asSafeNumber(rawGameResult.round),
          createdAt: asString(rawGameResult.createdAt) || nowIso(),
        }
      : null;

  return {
    round: typeof input.round === 'number' ? Math.max(0, input.round) : 0,
    phase: allowedPhases.has(input.phase) ? input.phase : 'idle',
    actions,
    votes,
    events,
    eliminatedPlayerIds: asStringArray(input.eliminatedPlayerIds),
    lastResult,
    lastVoteSummary,
    gameResult: gameResult?.winner ? gameResult : null,
    graveyardMessages,
  };
};

export const getActionTypeForRole = (role?: string | null) => {
  if (role === Role.MAFIA) return 'mafia_kill';
  if (role === Role.DOCTOR) return 'doctor_heal';
  if (role === Role.DETECTIVE) return 'detective_check';
  if (role === Role.LADY) return 'lady_silence';
  return null;
};

export const appendRoundEvent = (state: any, round: number, type: string, message: string) => ({
  ...state,
  events: [
    ...state.events,
    {
      id: globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2),
      round,
      type: allowedEventTypes.has(type) ? type : 'note',
      message,
      createdAt: nowIso(),
    },
  ],
});

export const appendGraveyardMessage = (state: any, senderId: string, senderName: string, message: string) => ({
  ...state,
  graveyardMessages: [
    ...(Array.isArray(state.graveyardMessages) ? state.graveyardMessages : []),
    {
      id: globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2),
      senderId,
      senderName,
      message,
      createdAt: nowIso(),
    },
  ].slice(-200),
});
