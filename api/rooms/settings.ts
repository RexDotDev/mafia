import { supabaseAdmin } from '../_shared/supabase';
import { normalizeRoomCode, sanitizeSettings } from '../_shared/roomUtils';

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
  const settingsInput = body?.settings;

  if (!roomCode || !clientId || !settingsInput) {
    return toJson(res, 400, { error: 'Missing roomCode, clientId, or settings' });
  }

  const code = normalizeRoomCode(roomCode);
  const { data: room, error: roomError } = await supabaseAdmin
    .from('rooms')
    .select('id, status')
    .eq('code', code)
    .maybeSingle();

  if (roomError || !room) {
    return toJson(res, 404, { error: 'Room not found' });
  }

  if (room.status !== 'waiting') {
    return toJson(res, 409, { error: 'Room already started' });
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
    return toJson(res, 403, { error: 'Only host can update settings' });
  }

  const sanitized = sanitizeSettings(settingsInput);
  const { error: updateError } = await supabaseAdmin
    .from('rooms')
    .update({ settings: sanitized })
    .eq('id', room.id);

  if (updateError) {
    return toJson(res, 500, { error: 'Failed to update settings' });
  }

  return toJson(res, 200, { data: { ok: true } });
}
