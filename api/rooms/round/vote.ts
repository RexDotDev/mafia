import { supabaseAdmin } from '../../../server/supabase.js';
import { appendRoundEvent, normalizeRoundState } from '../../../server/roundState.js';
import { normalizeRoomCode, sanitizeSettings } from '../../../server/roomUtils.js';
import { normalizeRoleName, Role } from '../../../types.js';

const toJson = (res: any, status: number, payload: any) => {
  res.status(status).json(payload);
};

const evaluateWinner = (alivePlayers: any[]) => {
  const mafiaAlive = alivePlayers.filter((player) => player.role === Role.MAFIA).length;
  const cityAlive = alivePlayers.length - mafiaAlive;
  if (mafiaAlive === 0) return 'city';
  if (mafiaAlive >= cityAlive) return 'mafia';
  return null;
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return toJson(res, 405, { error: 'Method not allowed' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const roomCode = String(body?.roomCode || '').trim();
  const clientId = String(body?.clientId || '').trim();
  const targetId = String(body?.targetId || body?.eliminatedPlayerId || '').trim();

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
    return toJson(res, 409, { error: 'Voting is available after the game starts.' });
  }

  const { data: voter, error: voterError } = await supabaseAdmin
    .from('players')
    .select('id, name, is_narrator')
    .eq('room_id', room.id)
    .eq('client_id', clientId)
    .maybeSingle();

  if (voterError || !voter) {
    return toJson(res, 403, { error: 'Player not found' });
  }

  if (voter.is_narrator) {
    return toJson(res, 403, { error: 'The narrator does not vote.' });
  }

  const settings = sanitizeSettings(room.settings);
  if (settings.casualMode) {
    return toJson(res, 409, { error: 'Role-only mode does not use in-app voting.' });
  }
  const roundState = normalizeRoundState(settings.roundState);
  if (roundState.gameResult) {
    return toJson(res, 409, { error: 'The game is already over.' });
  }
  if (roundState.phase !== 'voting') {
    return toJson(res, 409, { error: 'Voting is not active.' });
  }

  const { data: players, error: playersError } = await supabaseAdmin
    .from('players')
    .select('id, name, role, is_narrator')
    .eq('room_id', room.id);

  if (playersError || !players) {
    return toJson(res, 500, { error: 'Failed to load players' });
  }

  const normalizedPlayers = players.map((player: any) => ({
    ...player,
    role: normalizeRoleName(player.role),
  }));
  const alivePlayers = normalizedPlayers.filter(
    (player: any) => !player.is_narrator && !roundState.eliminatedPlayerIds.includes(player.id),
  );

  if (!alivePlayers.find((player: any) => player.id === voter.id)) {
    return toJson(res, 403, { error: 'Eliminated players cannot vote.' });
  }

  if (!targetId) {
    return toJson(res, 400, { error: 'Choose a player before submitting your vote.' });
  }

  const target = alivePlayers.find((player: any) => player.id === targetId);
  if (!target) {
    return toJson(res, 404, { error: 'Invalid voting target.' });
  }

  const nextVotes = roundState.votes
    .filter((vote: any) => vote.voterId !== voter.id)
    .concat({
      voterId: voter.id,
      voterName: voter.name,
      targetId: target.id,
      targetName: target.name,
      createdAt: new Date().toISOString(),
    });

  const totalVoters = alivePlayers.length;
  const completedVoters = nextVotes.length;
  const everyoneVoted = totalVoters > 0 && completedVoters >= totalVoters;

  if (!everyoneVoted) {
    const { error: partialUpdateError } = await supabaseAdmin
      .from('rooms')
      .update({
        settings: {
          ...settings,
          roundState: {
            ...roundState,
            votes: nextVotes,
          },
        },
      })
      .eq('id', room.id);

    if (partialUpdateError) {
      return toJson(res, 500, { error: 'Failed to submit vote' });
    }

    return toJson(res, 200, { data: { ok: true } });
  }

  const voteCounts = alivePlayers.map((player: any) => ({
    playerId: player.id,
    playerName: player.name,
    votes: nextVotes.filter((vote: any) => vote.targetId === player.id).length,
  }));

  const sortedCounts = [...voteCounts].sort((a, b) => {
    if (b.votes !== a.votes) return b.votes - a.votes;
    return a.playerName.localeCompare(b.playerName);
  });

  const topVotes = sortedCounts[0]?.votes ?? 0;
  const leaders = sortedCounts.filter((entry) => entry.votes === topVotes);
  const eliminated = topVotes > 0 && leaders.length === 1 ? leaders[0] : null;

  const nextEliminated = eliminated
    ? Array.from(new Set([...roundState.eliminatedPlayerIds, eliminated.playerId]))
    : roundState.eliminatedPlayerIds;

  let eventMessage = 'No player was eliminated in the vote.';
  if (eliminated) {
    eventMessage = `${eliminated.playerName} was eliminated with ${eliminated.votes} ${
      eliminated.votes === 1 ? 'vote' : 'votes'
    }.`;
  } else if (topVotes > 0) {
    eventMessage = `The vote ended in a tie at ${topVotes} ${
      topVotes === 1 ? 'vote' : 'votes'
    }. No player was eliminated.`;
  }
  const aliveAfterVote = normalizedPlayers.filter(
    (player: any) => !player.is_narrator && !nextEliminated.includes(player.id),
  );
  const winner = evaluateWinner(aliveAfterVote);

  let nextState = appendRoundEvent(
    {
      ...roundState,
      phase: 'idle',
      votes: [],
      eliminatedPlayerIds: nextEliminated,
      lastVoteSummary: {
        totalVoters,
        completedVoters,
        eliminatedPlayerId: eliminated?.playerId ?? null,
        eliminatedPlayerName: eliminated?.playerName ?? null,
        voteCounts: sortedCounts,
      },
      gameResult: winner
        ? {
            winner,
            message: winner === 'city' ? 'The town wins.' : 'The Mafia wins.',
            round: roundState.round,
            createdAt: new Date().toISOString(),
          }
        : null,
    },
    roundState.round,
    'vote_elimination',
    eventMessage,
  );

  if (winner) {
    nextState = appendRoundEvent(
      nextState,
      roundState.round,
      'note',
      winner === 'city' ? 'Game over: the town wins.' : 'Game over: the Mafia wins.',
    );
  }

  const { error: updateError } = await supabaseAdmin
    .from('rooms')
    .update({ settings: { ...settings, roundState: nextState } })
    .eq('id', room.id);

  if (updateError) {
    return toJson(res, 500, { error: 'Failed to resolve voting' });
  }

  return toJson(res, 200, { data: { ok: true } });
}
