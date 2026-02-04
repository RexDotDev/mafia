import { supabaseAdmin } from '../_shared/supabase.js';
import { normalizeRoomCode, sanitizeSettings } from '../_shared/roomUtils.js';
import { Role } from '../../types.js';

const toJson = (res: any, status: number, payload: any) => {
  res.status(status).json(payload);
};

const shuffle = (items: string[]) => {
  const array = [...items];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
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
    return toJson(res, 403, { error: 'Only host can start the game' });
  }

  const { data: players, error: playersError } = await supabaseAdmin
    .from('players')
    .select('id')
    .eq('room_id', room.id)
    .order('created_at', { ascending: true });

  if (playersError || !players || players.length === 0) {
    return toJson(res, 400, { error: 'No players in room' });
  }

  const settings = sanitizeSettings(room.settings);
  const extraRoles = (settings.doctor ? 1 : 0) + (settings.detective ? 1 : 0);
  const maxMafia = Math.max(1, players.length - extraRoles);
  const mafiaCount = Math.min(Math.max(settings.mafiaCount, 1), maxMafia);

  const roles: string[] = [];
  for (let i = 0; i < mafiaCount; i += 1) roles.push(Role.MAFIA);
  if (settings.doctor) roles.push(Role.DOCTOR);
  if (settings.detective) roles.push(Role.DETECTIVE);
  while (roles.length < players.length) roles.push(Role.VILLAGER);

  const shuffledRoles = shuffle(roles);
  for (let index = 0; index < players.length; index += 1) {
    const player = players[index];
    const { error: updateError } = await supabaseAdmin
      .from('players')
      .update({
        role: shuffledRoles[index],
        has_confirmed: false,
      })
      .eq('id', player.id);

    if (updateError) {
      console.error('Failed to assign roles', updateError);
      return toJson(res, 500, { error: updateError.message || 'Failed to assign roles' });
    }
  }

  const { error: updateRoomError } = await supabaseAdmin
    .from('rooms')
    .update({ status: 'started', settings: { ...settings, mafiaCount } })
    .eq('id', room.id);

  if (updateRoomError) {
    console.error('Failed to update room status', updateRoomError);
    return toJson(res, 500, { error: updateRoomError.message || 'Failed to update room status' });
  }

  return toJson(res, 200, { data: { ok: true } });
}
