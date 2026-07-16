import { supabaseAdmin } from '../../server/supabase.js';
import { normalizeRoomCode, sanitizeSettings } from '../../server/roomUtils.js';
import { normalizeRoundState } from '../../server/roundState.js';
import { normalizeRoleName, Role } from '../../types.js';

const toJson = (res: any, status: number, payload: any) => {
  res.status(status).json(payload);
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return toJson(res, 405, { error: 'Method not allowed' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const roomId = String(body?.roomId || '').trim();
  const roomCode = normalizeRoomCode(String(body?.roomCode || ''));
  const clientId = String(body?.clientId || '').trim();

  if (!roomId || !roomCode || !clientId) {
    return toJson(res, 400, { error: 'Missing roomId, roomCode, or clientId' });
  }

  const { data: room, error: roomError } = await supabaseAdmin
    .from('rooms')
    .select('id, code, status, settings')
    .eq('id', roomId)
    .eq('code', roomCode)
    .maybeSingle();

  if (roomError || !room) {
    return toJson(res, 404, { error: 'Room not found' });
  }

  const { data: players, error: playersError } = await supabaseAdmin
    .from('players')
    .select('id, client_id, name, role, has_confirmed, is_host, is_narrator, created_at')
    .eq('room_id', room.id)
    .order('created_at', { ascending: true });

  if (playersError || !players) {
    return toJson(res, 500, { error: 'Failed to load players' });
  }

  const normalizedPlayers = players.map((player: any) => ({
    ...player,
    role: normalizeRoleName(player.role),
  }));
  const requester = normalizedPlayers.find((player: any) => player.client_id === clientId);
  if (!requester) {
    return toJson(res, 403, { error: 'Player not found' });
  }

  const { error: heartbeatError } = await supabaseAdmin
    .from('players')
    .update({ last_seen: new Date().toISOString() })
    .eq('id', requester.id);

  if (heartbeatError) {
    return toJson(res, 500, { error: 'Failed to update heartbeat' });
  }

  const settings = sanitizeSettings(room.settings);
  const roundState = normalizeRoundState(settings.roundState);
  const isNarrator = !!requester.is_narrator;
  const isEliminated = roundState.eliminatedPlayerIds.includes(requester.id);
  const isActiveMafia =
    requester.role === Role.MAFIA && !isEliminated && roundState.phase === 'night';

  const visiblePlayers = normalizedPlayers.map((player: any) => {
    const canSeeRole =
      isNarrator ||
      player.id === requester.id ||
      (requester.role === Role.MAFIA && player.role === Role.MAFIA);

    return {
      id: player.id,
      clientId: player.id === requester.id ? player.client_id : '',
      name: player.name,
      role: canSeeRole ? player.role || undefined : undefined,
      hasConfirmed: !!player.has_confirmed,
      isHost: !!player.is_host,
      isNarrator: !!player.is_narrator,
    };
  });

  const visibleRoundState = {
    ...roundState,
    actions: isNarrator
      ? roundState.actions
      : roundState.actions.filter((action: any) => action.actorId === requester.id),
    votes: isNarrator
      ? roundState.votes
      : roundState.votes.filter((vote: any) => vote.voterId === requester.id),
    events: isNarrator ? roundState.events : [],
    lastResult: isNarrator ? roundState.lastResult : null,
    graveyardMessages: isNarrator || isEliminated ? roundState.graveyardMessages : [],
    mafiaMessages: isNarrator || isActiveMafia ? roundState.mafiaMessages : [],
  };

  return toJson(res, 200, {
    data: {
      id: room.id,
      status: room.status,
      settings: {
        mafiaCount: settings.mafiaCount,
        doctor: settings.doctor,
        detective: settings.detective,
        lady: settings.lady,
        casualMode: settings.casualMode,
        customRoles: settings.customRoles,
      },
      players: visiblePlayers,
      roundState: settings.roundState ? visibleRoundState : null,
    },
  });
}
