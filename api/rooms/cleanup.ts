import { supabaseAdmin } from '../_shared/supabase.js';

const toJson = (res: any, status: number, payload: any) => {
  res.status(status).json(payload);
};

const STALE_MINUTES = 20;

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return toJson(res, 405, { error: 'Method not allowed' });
  }

  const secret = process.env.CLEANUP_SECRET;
  if (secret) {
    const provided = req.headers['x-cleanup-secret'] || req.query?.secret;
    if (String(provided || '') !== secret) {
      return toJson(res, 401, { error: 'Unauthorized' });
    }
  }

  const cutoff = new Date(Date.now() - STALE_MINUTES * 60 * 1000).toISOString();
  const { error: deletePlayersError } = await supabaseAdmin
    .from('players')
    .delete()
    .lt('last_seen', cutoff);

  if (deletePlayersError) {
    return toJson(res, 500, { error: 'Failed to delete stale players' });
  }

  const { data: rooms, error: roomsError } = await supabaseAdmin
    .from('rooms')
    .select('id, players(count)');

  if (roomsError || !rooms) {
    return toJson(res, 500, { error: 'Failed to load rooms' });
  }

  const emptyRoomIds = rooms
    .filter((room: any) => {
      const count = Array.isArray(room.players) ? Number(room.players[0]?.count ?? 0) : 0;
      return count === 0;
    })
    .map((room: any) => room.id);

  if (emptyRoomIds.length > 0) {
    const { error: deleteRoomsError } = await supabaseAdmin
      .from('rooms')
      .delete()
      .in('id', emptyRoomIds);

    if (deleteRoomsError) {
      return toJson(res, 500, { error: 'Failed to delete empty rooms' });
    }
  }

  return toJson(res, 200, { data: { ok: true, removedRooms: emptyRoomIds.length } });
}
