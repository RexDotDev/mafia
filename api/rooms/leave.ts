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
    .select('id, is_host')
    .eq('room_id', room.id)
    .eq('client_id', clientId)
    .maybeSingle();

  if (playerError) {
    return toJson(res, 500, { error: 'Failed to load player' });
  }

  if (!player) {
    return toJson(res, 200, { data: { ok: true } });
  }

  const { error: deleteError } = await supabaseAdmin
    .from('players')
    .delete()
    .eq('id', player.id);

  if (deleteError) {
    return toJson(res, 500, { error: 'Failed to remove player' });
  }

  const { data: remainingPlayers, error: remainingError } = await supabaseAdmin
    .from('players')
    .select('id, is_host, created_at')
    .eq('room_id', room.id)
    .order('created_at', { ascending: true });

  if (remainingError) {
    return toJson(res, 500, { error: 'Failed to load remaining players' });
  }

  if (!remainingPlayers || remainingPlayers.length === 0) {
    const { error: deleteRoomError } = await supabaseAdmin
      .from('rooms')
      .delete()
      .eq('id', room.id);

    if (deleteRoomError) {
      return toJson(res, 500, { error: 'Failed to remove room' });
    }

    return toJson(res, 200, { data: { ok: true } });
  }

  if (player.is_host) {
    const hasHost = remainingPlayers.some((p) => p.is_host);
    if (!hasHost) {
      const nextHost = remainingPlayers[0];
      const { error: promoteError } = await supabaseAdmin
        .from('players')
        .update({ is_host: true })
        .eq('id', nextHost.id);

      if (promoteError) {
        return toJson(res, 500, { error: 'Failed to promote new host' });
      }
    }
  }

  return toJson(res, 200, { data: { ok: true } });
}
