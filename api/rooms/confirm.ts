import { supabaseAdmin } from '../../server/supabase.js';
import { normalizeRoomCode } from '../../server/roomUtils.js';

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
    .select('id, status')
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

  if (playerError || !player) {
    return toJson(res, 404, { error: 'Player not found' });
  }

  const { error: updatePlayerError } = await supabaseAdmin
    .from('players')
    .update({ has_confirmed: true })
    .eq('id', player.id);

  if (updatePlayerError) {
    return toJson(res, 500, { error: 'Failed to confirm role' });
  }

  const { data: players, error: playersError } = await supabaseAdmin
    .from('players')
    .select('has_confirmed')
    .eq('room_id', room.id);

  if (playersError || !players) {
    return toJson(res, 500, { error: 'Failed to load players' });
  }

  const allConfirmed = players.every((p) => p.has_confirmed);
  if (allConfirmed) {
    const { error: updateRoomError } = await supabaseAdmin
      .from('rooms')
      .update({ status: 'finished' })
      .eq('id', room.id);

    if (updateRoomError) {
      return toJson(res, 500, { error: 'Failed to finish room' });
    }
  }

  return toJson(res, 200, { data: { ok: true } });
}
