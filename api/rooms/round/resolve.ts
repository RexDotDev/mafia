import { supabaseAdmin } from '../../_shared/supabase.js';
import { Role } from '../../../types.js';
import { appendRoundEvent, createDefaultRoundResult, normalizeRoundState } from '../../_shared/roundState.js';
import { normalizeRoomCode, sanitizeSettings } from '../../_shared/roomUtils.js';

const toJson = (res: any, status: number, payload: any) => {
  res.status(status).json(payload);
};

const pickLatest = (actions: any[]) =>
  [...actions].sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1))[0];

const pickMafiaTarget = (actions: any[]) => {
  if (!actions.length) return null;
  const countByTarget = new Map<string, { count: number; latestAt: string; action: any }>();
  for (const action of actions) {
    const existing = countByTarget.get(action.targetId);
    if (!existing) {
      countByTarget.set(action.targetId, {
        count: 1,
        latestAt: action.createdAt,
        action,
      });
      continue;
    }
    countByTarget.set(action.targetId, {
      count: existing.count + 1,
      latestAt: action.createdAt > existing.latestAt ? action.createdAt : existing.latestAt,
      action: action.createdAt > existing.latestAt ? action : existing.action,
    });
  }

  return [...countByTarget.values()].sort((a, b) => {
    if (a.count !== b.count) return b.count - a.count;
    return a.latestAt > b.latestAt ? -1 : 1;
  })[0]?.action ?? null;
};

const evaluateWinner = (alivePlayers: any[]) => {
  const mafiaAlive = alivePlayers.filter((player) => player.role === Role.MAFIA).length;
  const cityAlive = alivePlayers.length - mafiaAlive;
  if (mafiaAlive === 0) return 'city';
  if (mafiaAlive >= cityAlive) return 'mafia';
  return null;
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return toJson(res, 405, { error: 'Method not allowed' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const roomCode = String(body?.roomCode || '').trim();
  const clientId = String(body?.clientId || '').trim();

  if (!roomCode || !clientId) {
    return toJson(res, 400, { error: 'Missing roomCode or clientId' });
  }

  const code = normalizeRoomCode(roomCode);
  const { data: room, error: roomError } = await supabaseAdmin
    .from('rooms')
    .select('id, status, settings')
    .eq('code', code)
    .maybeSingle();

  if (roomError || !room) {
    return toJson(res, 404, { error: 'Room not found' });
  }

  const { data: narrator, error: narratorError } = await supabaseAdmin
    .from('players')
    .select('id, is_narrator')
    .eq('room_id', room.id)
    .eq('client_id', clientId)
    .maybeSingle();

  if (narratorError || !narrator) {
    return toJson(res, 403, { error: 'Player not found' });
  }

  if (!narrator.is_narrator) {
    return toJson(res, 403, { error: 'Samo narator moze da zakljuci noc.' });
  }

  const { data: players, error: playersError } = await supabaseAdmin
    .from('players')
    .select('id, name, role, is_narrator')
    .eq('room_id', room.id);

  if (playersError || !players) {
    return toJson(res, 500, { error: 'Failed to load players' });
  }

  const settings = sanitizeSettings(room.settings);
  const roundState = normalizeRoundState(settings.roundState);
  if (roundState.gameResult) {
    return toJson(res, 409, { error: 'Igra je vec zavrsena.' });
  }
  if (roundState.phase !== 'night') {
    return toJson(res, 409, { error: 'Nocna runda nije aktivna.' });
  }

  const activePlayers = players.filter((player: any) => !player.is_narrator);
  const aliveIds = new Set(
    activePlayers
      .map((player: any) => player.id)
      .filter((playerId: string) => !roundState.eliminatedPlayerIds.includes(playerId)),
  );
  const playerById = new Map(activePlayers.map((player: any) => [player.id, player]));

  const latestLadyAction = pickLatest(
    roundState.actions.filter(
      (action: any) =>
        action.type === 'lady_silence' && aliveIds.has(action.actorId) && aliveIds.has(action.targetId),
    ),
  );
  const mutedPlayerId = latestLadyAction?.targetId ?? null;

  const latestDoctorAction = pickLatest(
    roundState.actions.filter(
      (action: any) =>
        action.type === 'doctor_heal' &&
        aliveIds.has(action.actorId) &&
        aliveIds.has(action.targetId) &&
        action.actorId !== mutedPlayerId,
    ),
  );

  const latestInspectorAction = pickLatest(
    roundState.actions.filter(
      (action: any) =>
        action.type === 'detective_check' &&
        aliveIds.has(action.actorId) &&
        aliveIds.has(action.targetId) &&
        action.actorId !== mutedPlayerId,
    ),
  );

  const mafiaAction = pickMafiaTarget(
    roundState.actions.filter(
      (action: any) =>
        action.type === 'mafia_kill' &&
        aliveIds.has(action.actorId) &&
        aliveIds.has(action.targetId) &&
        action.actorId !== mutedPlayerId,
    ),
  );

  const mafiaTargetId = mafiaAction?.targetId ?? null;
  const doctorTargetId = latestDoctorAction?.targetId ?? null;
  const inspectorTargetId = latestInspectorAction?.targetId ?? null;
  const doctorSaved = !!mafiaTargetId && mafiaTargetId === doctorTargetId;
  const killedPlayerId = mafiaTargetId && !doctorSaved ? mafiaTargetId : null;

  let inspectorIsMafia: boolean | null = null;
  if (inspectorTargetId) {
    const inspected = playerById.get(inspectorTargetId);
    if (inspected?.role === Role.LADY) {
      inspectorIsMafia = false;
    } else {
      inspectorIsMafia = inspected?.role === Role.MAFIA;
    }
  }

  const nextEliminated = killedPlayerId
    ? Array.from(new Set([...roundState.eliminatedPlayerIds, killedPlayerId]))
    : roundState.eliminatedPlayerIds;
  const aliveAfterNight = activePlayers.filter(
    (player: any) => !nextEliminated.includes(player.id),
  );
  const winner = evaluateWinner(aliveAfterNight);
  const shouldOpenVoting = aliveAfterNight.length > 0 && !winner;

  let nextState = {
    ...roundState,
    phase: shouldOpenVoting ? 'voting' : 'idle',
    actions: [],
    votes: [],
    mafiaMessages: [],
    eliminatedPlayerIds: nextEliminated,
    lastResult: {
      ...createDefaultRoundResult(),
      mafiaTargetId,
      killedPlayerId,
      doctorTargetId,
      doctorSaved,
      ladyTargetId: latestLadyAction?.targetId ?? null,
      inspectorTargetId,
      inspectorIsMafia,
      mutedPlayerId,
    },
    lastVoteSummary: null,
    gameResult: winner
      ? {
          winner,
          message: winner === 'city' ? 'Grad je pobedio.' : 'Mafija je pobedila.',
          round: roundState.round,
          createdAt: new Date().toISOString(),
        }
      : null,
  };

  if (latestLadyAction) {
    nextState = appendRoundEvent(
      nextState,
      roundState.round,
      'lady_silence',
      `Dama je ucutkala ${latestLadyAction.targetName}.`,
    );
  }

  if (latestInspectorAction) {
    nextState = appendRoundEvent(
      nextState,
      roundState.round,
      'detective_check',
      `Inspektor je proverio ${latestInspectorAction.targetName} - ${
        inspectorIsMafia ? 'mafijas' : 'nije mafijas'
      }.`,
    );
  }

  if (latestDoctorAction) {
    nextState = appendRoundEvent(
      nextState,
      roundState.round,
      'doctor_heal',
      doctorSaved
        ? `Lekar je uspesno izlecio ${latestDoctorAction.targetName}.`
        : `Lekar je lecio ${latestDoctorAction.targetName}, ali bez spasavanja.`,
    );
  }

  if (mafiaAction) {
    nextState = appendRoundEvent(
      nextState,
      roundState.round,
      'mafia_kill',
      killedPlayerId
        ? `Mafija je ubila ${mafiaAction.targetName}.`
        : `Mafija je napala ${mafiaAction.targetName}, ali je meta prezivela.`,
    );
  } else {
    nextState = appendRoundEvent(nextState, roundState.round, 'mafia_kill', 'Mafija nije izvrsila ubistvo.');
  }

  if (!shouldOpenVoting && !winner) {
    nextState = appendRoundEvent(
      nextState,
      roundState.round,
      'vote_elimination',
      'Nema zivih igraca za glasanje. Runda je automatski zavrsena.',
    );
  }

  if (winner) {
    nextState = appendRoundEvent(
      nextState,
      roundState.round,
      'note',
      winner === 'city' ? 'Kraj igre: grad je pobedio.' : 'Kraj igre: mafija je pobedila.',
    );
  }

  const { error: updateError } = await supabaseAdmin
    .from('rooms')
    .update({ settings: { ...settings, roundState: nextState } })
    .eq('id', room.id);

  if (updateError) {
    return toJson(res, 500, { error: 'Failed to resolve round' });
  }

  return toJson(res, 200, { data: { ok: true } });
}
