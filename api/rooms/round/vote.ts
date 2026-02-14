import { supabaseAdmin } from '../../_shared/supabase.js';
import { appendRoundEvent, normalizeRoundState } from '../../_shared/roundState.js';
import { normalizeRoomCode, sanitizeSettings } from '../../_shared/roomUtils.js';

const toJson = (res: any, status: number, payload: any) => {
  res.status(status).json(payload);
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return toJson(res, 405, { error: 'Method not allowed' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const roomCode = String(body?.roomCode || '').trim();
  const clientId = String(body?.clientId || '').trim();
  const eliminatedPlayerId = body?.eliminatedPlayerId ? String(body.eliminatedPlayerId).trim() : '';

  if (!roomCode || !clientId) {
    return toJson(res, 400, { error: 'Missing roomCode or clientId' });
  }

  const code = normalizeRoomCode(roomCode);
  const { data: room, error: roomError } = await supabaseAdmin
    .from('rooms')
    .select('id, settings')
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
    return toJson(res, 403, { error: 'Samo narator moze da zavrsi glasanje.' });
  }

  const settings = sanitizeSettings(room.settings);
  const roundState = normalizeRoundState(settings.roundState);
  if (roundState.phase !== 'voting' && roundState.phase !== 'idle') {
    return toJson(res, 409, { error: 'Prvo zakljuci nocnu rundu.' });
  }

  let nextState = {
    ...roundState,
    phase: 'idle',
  };

  if (eliminatedPlayerId) {
    const { data: target, error: targetError } = await supabaseAdmin
      .from('players')
      .select('id, name, is_narrator')
      .eq('room_id', room.id)
      .eq('id', eliminatedPlayerId)
      .maybeSingle();

    if (targetError || !target || target.is_narrator) {
      return toJson(res, 404, { error: 'Neispravan igrac za eliminaciju.' });
    }

    const nextEliminated = Array.from(
      new Set([...roundState.eliminatedPlayerIds, eliminatedPlayerId]),
    );
    nextState = appendRoundEvent(
      {
        ...nextState,
        eliminatedPlayerIds: nextEliminated,
      },
      roundState.round,
      'vote_elimination',
      `Glasanjem je izbacen ${target.name}.`,
    );
  } else {
    nextState = appendRoundEvent(
      nextState,
      roundState.round,
      'vote_elimination',
      'U glasanju niko nije izbacen.',
    );
  }

  const { error: updateError } = await supabaseAdmin
    .from('rooms')
    .update({ settings: { ...settings, roundState: nextState } })
    .eq('id', room.id);

  if (updateError) {
    return toJson(res, 500, { error: 'Failed to finish voting' });
  }

  return toJson(res, 200, { data: { ok: true } });
}
