import { supabaseAdmin } from '../_shared/supabase.js';
import { DEFAULT_SETTINGS, normalizeRoomCode, sanitizeSettings } from '../_shared/roomUtils.js';

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
      .update({ name: playerName })
      .eq('id', existingPlayer.id);

    if (updatePlayerError) {
      return toJson(res, 500, { error: 'Failed to update player' });
    }

    return toJson(res, 200, { data: { roomId: room.id } });
  }

  if (room.status !== 'waiting') {
    return toJson(res, 409, { error: 'Igra je već počela!' });
  }

  if (!existingPlayer) {
    const { error: createPlayerError } = await supabaseAdmin.from('players').insert({
      room_id: room.id,
      name: playerName,
      client_id: clientId,
      has_confirmed: false,
      is_host: false,
    });

    if (createPlayerError) {
      return toJson(res, 500, { error: 'Failed to create player' });
    }
  }

  return toJson(res, 200, { data: { roomId: room.id } });
}
