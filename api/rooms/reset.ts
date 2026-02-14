import { supabaseAdmin } from '../_shared/supabase.js';
import { normalizeRoomCode } from '../_shared/roomUtils.js';
import { sanitizeSettings } from '../_shared/roomUtils.js';

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
    .select('id, settings')
    .eq('code', code)
    .maybeSingle();

  if (roomError || !room) {
    return toJson(res, 404, { error: 'Room not found' });
  }

  const { data: hostPlayer, error: hostError } = await supabaseAdmin
    .from('players')
    .select('id, is_host')
    .eq('room_id', room.id)
    .eq('client_id', clientId)
    .maybeSingle();

  if (hostError || !hostPlayer) {
    return toJson(res, 403, { error: 'Player not found' });
  }

  if (!hostPlayer.is_host) {
    return toJson(res, 403, { error: 'Only host can reset the game' });
  }

  const { error: resetPlayersError } = await supabaseAdmin
    .from('players')
    .update({ role: null, has_confirmed: false, is_narrator: false })
    .eq('room_id', room.id);

  if (resetPlayersError) {
    console.error('Failed to reset players', resetPlayersError);
    return toJson(res, 500, { error: resetPlayersError.message || 'Failed to reset players' });
  }

  const sanitizedSettings = sanitizeSettings(room.settings);

  const { error: resetRoomError } = await supabaseAdmin
    .from('rooms')
    .update({ status: 'waiting', settings: { ...sanitizedSettings, roundState: null } })
    .eq('id', room.id);

  if (resetRoomError) {
    console.error('Failed to reset room', resetRoomError);
    return toJson(res, 500, { error: resetRoomError.message || 'Failed to reset room' });
  }

  return toJson(res, 200, { data: { ok: true } });
}
