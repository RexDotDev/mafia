import { supabaseAdmin } from '../../server/supabase.js';
import {
  MAX_PLAYERS_PER_ROOM,
  normalizeRoomCode,
  sanitizeSettings,
} from '../../server/roomUtils.js';

const toJson = (res: any, status: number, payload: any) => {
  res.status(status).json(payload);
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return toJson(res, 405, { error: 'Method not allowed' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const roomCode = String(body?.roomCode || '').trim();
  const playerName = String(body?.playerName || '').trim();
  const clientId = String(body?.clientId || '').trim();
  const settingsInput = body?.settings;

  if (!roomCode || !playerName || !clientId) {
    return toJson(res, 400, { error: 'Missing roomCode, playerName, or clientId' });
  }

  const code = normalizeRoomCode(roomCode);
  if (!/^\d{6}$/.test(code)) {
    return toJson(res, 400, { error: 'Room code must contain exactly 6 digits' });
  }
  if (playerName.length > 32) {
    return toJson(res, 400, { error: 'Player name must be 32 characters or fewer' });
  }
  if (clientId.length > 128) {
    return toJson(res, 400, { error: 'Invalid client identifier' });
  }

  const { data: room, error: roomError } = await supabaseAdmin
    .from('rooms')
    .select('id, status')
    .eq('code', code)
    .maybeSingle();

  if (roomError) {
    return toJson(res, 500, { error: 'Failed to load room' });
  }

  if (!room) {
    if (!settingsInput) {
      return toJson(res, 404, { error: 'Soba ne postoji.' });
    }
    const settings = sanitizeSettings(settingsInput);
    const { data: createdRoom, error: createRoomError } = await supabaseAdmin
      .from('rooms')
      .insert({ code, status: 'waiting', settings })
      .select('id')
      .single();

    if (createRoomError || !createdRoom) {
      return toJson(res, 500, { error: 'Failed to create room' });
    }

    const { error: createPlayerError } = await supabaseAdmin.from('players').insert({
      room_id: createdRoom.id,
      name: playerName,
      client_id: clientId,
      has_confirmed: false,
      is_host: true,
      last_seen: new Date().toISOString(),
    });

    if (createPlayerError) {
      return toJson(res, 500, { error: 'Failed to create player' });
    }

    return toJson(res, 200, { data: { roomId: createdRoom.id } });
  }

  const { data: existingPlayer, error: existingError } = await supabaseAdmin
    .from('players')
    .select('id')
    .eq('room_id', room.id)
    .eq('client_id', clientId)
    .maybeSingle();

  if (existingError) {
    return toJson(res, 500, { error: 'Failed to load player' });
  }

  if (existingPlayer) {
    const { error: updatePlayerError } = await supabaseAdmin
      .from('players')
      .update({ name: playerName, last_seen: new Date().toISOString() })
      .eq('id', existingPlayer.id);

    if (updatePlayerError) {
      return toJson(res, 500, { error: 'Failed to update player' });
    }

    return toJson(res, 200, { data: { roomId: room.id } });
  }

  if (room.status !== 'waiting') {
    return toJson(res, 409, { error: 'Igra je već počela!' });
  }

  const { count: playerCount, error: countError } = await supabaseAdmin
    .from('players')
    .select('id', { count: 'exact', head: true })
    .eq('room_id', room.id);

  if (countError) {
    return toJson(res, 500, { error: 'Failed to check room capacity' });
  }

  if ((playerCount ?? 0) >= MAX_PLAYERS_PER_ROOM) {
    return toJson(res, 409, { error: `Soba je puna. Maksimum je ${MAX_PLAYERS_PER_ROOM} igrača.` });
  }

  if (!existingPlayer) {
    const { error: createPlayerError } = await supabaseAdmin.from('players').insert({
      room_id: room.id,
      name: playerName,
      client_id: clientId,
      has_confirmed: false,
      is_host: false,
      last_seen: new Date().toISOString(),
    });

    if (createPlayerError) {
      return toJson(res, 500, { error: 'Failed to create player' });
    }
  }

  return toJson(res, 200, { data: { roomId: room.id } });
}
