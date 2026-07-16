import { supabaseAdmin } from '../../server/supabase.js';
import { normalizeRoomCode, sanitizeSettings } from '../../server/roomUtils.js';
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
    .select('id, is_host, created_at')
    .eq('room_id', room.id)
    .order('created_at', { ascending: true });

  if (playersError || !players || players.length < 2) {
    return toJson(res, 400, { error: 'At least 2 players are required.' });
  }

  const narrator = players[Math.floor(Math.random() * players.length)];
  const participants = players.filter((player) => player.id !== narrator.id);

  if (participants.length === 0) {
    return toJson(res, 400, { error: 'At least 2 players are required.' });
  }

  const settings = sanitizeSettings(room.settings);
  const specialRoles: string[] = [Role.DOCTOR, Role.DETECTIVE];
  if (settings.lady) specialRoles.push(Role.LADY);
  (settings.customRoles ?? []).forEach((role) => {
    for (let i = 0; i < role.count; i += 1) specialRoles.push(role.name);
  });

  // Testing-friendly: allow small rooms and fill roles as much as possible.
  const maxMafia = Math.max(1, participants.length - 1);
  const mafiaCount = Math.min(Math.max(settings.mafiaCount, 1), maxMafia);

  const roles: string[] = [];
  for (let i = 0; i < mafiaCount; i += 1) roles.push(Role.MAFIA);
  for (const role of specialRoles) {
    if (roles.length >= participants.length) break;
    roles.push(role);
  }
  while (roles.length < participants.length) roles.push(Role.VILLAGER);

  const shuffledRoles = shuffle(roles);
  for (let index = 0; index < participants.length; index += 1) {
    const player = participants[index];
    const { error: updateError } = await supabaseAdmin
      .from('players')
      .update({
        role: shuffledRoles[index],
        has_confirmed: false,
        is_narrator: false,
      })
      .eq('id', player.id);

    if (updateError) {
      console.error('Failed to assign roles', updateError);
      return toJson(res, 500, { error: updateError.message || 'Failed to assign roles' });
    }
  }

  const { error: narratorError } = await supabaseAdmin
    .from('players')
    .update({
      role: Role.NARRATOR,
      has_confirmed: true,
      is_narrator: true,
    })
    .eq('id', narrator.id);

  if (narratorError) {
    return toJson(res, 500, { error: 'Failed to assign narrator' });
  }

  const { error: updateRoomError } = await supabaseAdmin
    .from('rooms')
    .update({ status: 'started', settings: { ...settings, mafiaCount, roundState: null } })
    .eq('id', room.id);

  if (updateRoomError) {
    console.error('Failed to update room status', updateRoomError);
    return toJson(res, 500, { error: updateRoomError.message || 'Failed to update room status' });
  }

  return toJson(res, 200, { data: { ok: true } });
}
