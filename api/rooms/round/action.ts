import { supabaseAdmin } from '../../../server/supabase.js';
import { Role } from '../../../types.js';
import {
  appendGraveyardMessage,
  appendMafiaMessage,
  getActionTypeForRole,
  normalizeRoundState,
} from '../../../server/roundState.js';
import { normalizeRoomCode, sanitizeSettings } from '../../../server/roomUtils.js';

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
  const targetId = String(body?.targetId || '').trim();
  const message = String(body?.message || '').trim();
  const chatScope = String(body?.chatScope || '').trim().toLowerCase();

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

  if (room.status !== 'finished') {
    return toJson(res, 409, { error: 'Akcije su dostupne tek kada igra pocne.' });
  }

  const settings = sanitizeSettings(room.settings);
  if (settings.casualMode) {
    return toJson(res, 409, { error: 'Kezual mod: akcije i chat su iskljuceni.' });
  }
  const roundState = normalizeRoundState(settings.roundState);

  const { data: actor, error: actorError } = await supabaseAdmin
    .from('players')
    .select('id, name, role, is_narrator')
    .eq('room_id', room.id)
    .eq('client_id', clientId)
    .maybeSingle();

  if (actorError || !actor) {
    return toJson(res, 404, { error: 'Player not found' });
  }

  if (message) {
    if (chatScope === 'mafia') {
      if (roundState.gameResult) {
        return toJson(res, 409, { error: 'Igra je zavrsena.' });
      }
      if (roundState.phase !== 'night') {
        return toJson(res, 409, { error: 'Mafija chat je dostupan samo nocu.' });
      }
      if (actor.is_narrator) {
        return toJson(res, 403, { error: 'Narator nema pristup mafija chatu.' });
      }
      if (roundState.eliminatedPlayerIds.includes(actor.id)) {
        return toJson(res, 403, { error: 'Eliminisani igraci nemaju pristup mafija chatu.' });
      }
      if (actor.role !== Role.MAFIA) {
        return toJson(res, 403, { error: 'Samo mafija moze pisati u mafija chat.' });
      }

      const nextRoundState = appendMafiaMessage(
        roundState,
        actor.id,
        actor.name,
        message.slice(0, 800),
      );
      const { error: updateMessageError } = await supabaseAdmin
        .from('rooms')
        .update({ settings: { ...settings, roundState: nextRoundState } })
        .eq('id', room.id);

      if (updateMessageError) {
        return toJson(res, 500, { error: 'Failed to send mafia message' });
      }

      return toJson(res, 200, { data: { ok: true } });
    }

    if (actor.is_narrator) {
      return toJson(res, 403, { error: 'Narator ne moze da pise u chat.' });
    }
    if (!roundState.eliminatedPlayerIds.includes(actor.id)) {
      return toJson(res, 403, { error: 'Samo eliminisani igraci mogu pisati u groblju.' });
    }

    const nextRoundState = appendGraveyardMessage(
      roundState,
      actor.id,
      actor.name,
      message.slice(0, 800),
    );
    const { error: updateMessageError } = await supabaseAdmin
      .from('rooms')
      .update({ settings: { ...settings, roundState: nextRoundState } })
      .eq('id', room.id);

    if (updateMessageError) {
      return toJson(res, 500, { error: 'Failed to send graveyard message' });
    }

    return toJson(res, 200, { data: { ok: true } });
  }

  if (!targetId) {
    return toJson(res, 400, { error: 'Missing targetId' });
  }

  if (roundState.gameResult) {
    return toJson(res, 409, { error: 'Igra je zavrsena.' });
  }

  if (roundState.phase !== 'night') {
    return toJson(res, 409, { error: 'Nocna runda nije aktivna.' });
  }

  if (actor.is_narrator) {
    return toJson(res, 403, { error: 'Narator ne salje nocne akcije.' });
  }

  if (roundState.eliminatedPlayerIds.includes(actor.id)) {
    return toJson(res, 403, { error: 'Eliminisani igraci ne mogu da igraju akcije.' });
  }

  const actionType = getActionTypeForRole(actor.role);
  if (!actionType) {
    return toJson(res, 403, { error: 'Ova uloga nema nocnu akciju.' });
  }

  const { data: target, error: targetError } = await supabaseAdmin
    .from('players')
    .select('id, name, is_narrator')
    .eq('room_id', room.id)
    .eq('id', targetId)
    .maybeSingle();

  if (targetError || !target || target.is_narrator) {
    return toJson(res, 404, { error: 'Neispravan cilj akcije.' });
  }

  if (roundState.eliminatedPlayerIds.includes(target.id)) {
    return toJson(res, 409, { error: 'Cilj je vec eliminisan.' });
  }

  const nextActions = roundState.actions
    .filter((action: any) => action.actorId !== actor.id)
    .concat({
      actorId: actor.id,
      actorName: actor.name,
      role: actor.role,
      type: actionType,
      targetId: target.id,
      targetName: target.name,
      createdAt: new Date().toISOString(),
    });

  const nextRoundState = {
    ...roundState,
    actions: nextActions,
  };

  const { error: updateError } = await supabaseAdmin
    .from('rooms')
    .update({ settings: { ...settings, roundState: nextRoundState } })
    .eq('id', room.id);

  if (updateError) {
    return toJson(res, 500, { error: 'Failed to submit action' });
  }

  return toJson(res, 200, { data: { ok: true } });
}
