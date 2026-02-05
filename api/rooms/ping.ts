import { supabaseAdmin } from '../_shared/supabase.js';
import { normalizeRoomCode } from '../_shared/roomUtils.js';

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
    .select('id')
    .eq('code', code)
    .maybeSingle();

  if (roomError || !room) {
    return toJson(res, 404, { error: 'Room not found' });
  }

  const { data: player, error: playerError } = await supabaseAdmin
    .from('players')
    .select('id')
    .eq('room_id', room.id)
    .eq('client_id', clientId)
    .maybeSingle();

  if (playerError) {
    return toJson(res, 500, { error: 'Failed to load player' });
  }

  if (!player) {
    return toJson(res, 404, { error: 'Player not found' });
  }

  const { error: updateError } = await supabaseAdmin
    .from('players')
    .update({ last_seen: new Date().toISOString() })
    .eq('id', player.id);

  if (updateError) {
    return toJson(res, 500, { error: 'Failed to update heartbeat' });
  }

  return toJson(res, 200, { data: { ok: true } });
}
