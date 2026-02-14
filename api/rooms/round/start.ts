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

  if (room.status !== 'finished') {
    return toJson(res, 409, { error: 'Runda moze da krene tek kada svi potvrde uloge.' });
  }

  const { data: player, error: playerError } = await supabaseAdmin
    .from('players')
    .select('id, is_narrator')
    .eq('room_id', room.id)
    .eq('client_id', clientId)
    .maybeSingle();

  if (playerError || !player) {
    return toJson(res, 403, { error: 'Player not found' });
  }

  if (!player.is_narrator) {
    return toJson(res, 403, { error: 'Samo narator moze da pokrene rundu.' });
  }

  const settings = sanitizeSettings(room.settings);
  const currentState = normalizeRoundState(settings.roundState);
  if (currentState.gameResult) {
    return toJson(res, 409, { error: 'Igra je zavrsena. Pokreni novu podelu uloga.' });
  }
  if (currentState.phase === 'night') {
    return toJson(res, 409, { error: 'Nocna runda je vec u toku.' });
  }
  if (currentState.phase === 'voting') {
    return toJson(res, 409, { error: 'Glasanje jos traje.' });
  }

  const nextRound = currentState.round + 1;
  let nextState = {
    ...currentState,
    round: nextRound,
    phase: 'night',
    actions: [],
    votes: [],
    lastResult: null,
    lastVoteSummary: null,
    gameResult: null,
    mafiaMessages: [],
  };
  nextState = appendRoundEvent(nextState, nextRound, 'round_started', `Runda ${nextRound} je pokrenuta.`);

  const { error: updateError } = await supabaseAdmin
    .from('rooms')
    .update({ settings: { ...settings, roundState: nextState } })
    .eq('id', room.id);

  if (updateError) {
    return toJson(res, 500, { error: 'Failed to start round' });
  }

  return toJson(res, 200, { data: { ok: true } });
}
