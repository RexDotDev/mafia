import { supabaseAdmin } from '../../_shared/supabase.js';
import { appendGraveyardMessage, normalizeRoundState } from '../../_shared/roundState.js';
import { normalizeRoomCode, sanitizeSettings } from '../../_shared/roomUtils.js';

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
  const messageRaw = String(body?.message || '').trim();

  if (!roomCode || !clientId || !messageRaw) {
    return toJson(res, 400, { error: 'Missing roomCode, clientId, or message' });
  }

  const message = messageRaw.slice(0, 800);
  const code = normalizeRoomCode(roomCode);
  const { data: room, error: roomError } = await supabaseAdmin
    .from('rooms')
    .select('id, status, settings')
    .eq('code', code)
    .maybeSingle();

  if (roomError || !room) {
    return toJson(res, 404, { error: 'Room not found' });
  }

  const settings = sanitizeSettings(room.settings);
  const roundState = normalizeRoundState(settings.roundState);

  const { data: sender, error: senderError } = await supabaseAdmin
    .from('players')
    .select('id, name, is_narrator')
    .eq('room_id', room.id)
    .eq('client_id', clientId)
    .maybeSingle();

  if (senderError || !sender) {
    return toJson(res, 404, { error: 'Player not found' });
  }

  if (sender.is_narrator) {
    return toJson(res, 403, { error: 'Narator ima samo pregled groblja.' });
  }

  const isEliminated = roundState.eliminatedPlayerIds.includes(sender.id);
  if (!isEliminated) {
    return toJson(res, 403, { error: 'Samo eliminisani igraci mogu pisati u groblju.' });
  }

  const nextRoundState = appendGraveyardMessage(roundState, sender.id, sender.name, message);
  const { error: updateError } = await supabaseAdmin
    .from('rooms')
    .update({ settings: { ...settings, roundState: nextRoundState } })
    .eq('id', room.id);

  if (updateError) {
    return toJson(res, 500, { error: 'Failed to send graveyard message' });
  }

  return toJson(res, 200, { data: { ok: true } });
}
