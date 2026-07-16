import { supabaseAdmin } from '../../../server/supabase.js';
import { normalizeRoleName, Role } from '../../../types.js';
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
    return toJson(res, 409, { error: 'Actions are available after the game starts.' });
  }

  const settings = sanitizeSettings(room.settings);
  if (settings.casualMode) {
    return toJson(res, 409, { error: 'Role-only mode does not use in-app actions or chat.' });
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
  const actorRole = normalizeRoleName(actor.role);

  if (message) {
    if (chatScope === 'mafia') {
      if (roundState.gameResult) {
        return toJson(res, 409, { error: 'The game is over.' });
      }
      if (roundState.phase !== 'night') {
        return toJson(res, 409, { error: 'Mafia chat is available only at night.' });
      }
      if (actor.is_narrator) {
        return toJson(res, 403, { error: 'The narrator cannot access Mafia chat.' });
      }
      if (roundState.eliminatedPlayerIds.includes(actor.id)) {
        return toJson(res, 403, { error: 'Eliminated players cannot access Mafia chat.' });
      }
      if (actorRole !== Role.MAFIA) {
        return toJson(res, 403, { error: 'Only Mafia members can use Mafia chat.' });
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
      return toJson(res, 403, { error: 'The narrator cannot post in player chat.' });
    }
    if (!roundState.eliminatedPlayerIds.includes(actor.id)) {
      return toJson(res, 403, { error: 'Only eliminated players can use the graveyard chat.' });
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
    return toJson(res, 409, { error: 'The game is over.' });
  }

  if (roundState.phase !== 'night') {
    return toJson(res, 409, { error: 'There is no active night round.' });
  }

  if (actor.is_narrator) {
    return toJson(res, 403, { error: 'The narrator does not submit night actions.' });
  }

  if (roundState.eliminatedPlayerIds.includes(actor.id)) {
    return toJson(res, 403, { error: 'Eliminated players cannot submit actions.' });
  }

  const actionType = getActionTypeForRole(actorRole);
  if (!actionType) {
    return toJson(res, 403, { error: 'This role does not have a night action.' });
  }

  const { data: target, error: targetError } = await supabaseAdmin
    .from('players')
    .select('id, name, is_narrator')
    .eq('room_id', room.id)
    .eq('id', targetId)
    .maybeSingle();

  if (targetError || !target || target.is_narrator) {
    return toJson(res, 404, { error: 'Invalid action target.' });
  }

  if (roundState.eliminatedPlayerIds.includes(target.id)) {
    return toJson(res, 409, { error: 'That player has already been eliminated.' });
  }

  const nextActions = roundState.actions
    .filter((action: any) => action.actorId !== actor.id)
    .concat({
      actorId: actor.id,
      actorName: actor.name,
      role: actorRole || '',
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
