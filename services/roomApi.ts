type ApiResponse<T> = { data?: T; error?: string };

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const payload = (await response.json()) as ApiResponse<T>;
  if (!response.ok || payload.error) {
    throw new Error(payload.error || 'Request failed');
  }
  if (!payload.data) {
    throw new Error('Empty response');
  }
  return payload.data;
}

export async function getRoomState(payload: {
  roomId: string;
  roomCode: string;
  clientId: string;
}): Promise<{
  id: string;
  status: 'waiting' | 'started' | 'finished';
  settings: unknown;
  players: Array<{
    id: string;
    clientId: string;
    name: string;
    role?: string;
    hasConfirmed: boolean;
    isHost: boolean;
    isNarrator: boolean;
  }>;
  roundState: unknown;
}> {
  return postJson('/api/rooms/state', payload);
}

export async function joinRoom(payload: {
  roomCode: string;
  playerName: string;
  clientId: string;
  settings?: { mafiaCount: number; doctor: boolean; detective: boolean; lady: boolean; casualMode: boolean; customRoles: { name: string; count: number }[] };
}): Promise<{ roomId: string }> {
  return postJson<{ roomId: string }>('/api/rooms/join', payload);
}

export async function startGame(payload: {
  roomCode: string;
  clientId: string;
}): Promise<{ ok: true }> {
  return postJson<{ ok: true }>('/api/rooms/start', payload);
}

export async function confirmRole(payload: {
  roomCode: string;
  clientId: string;
}): Promise<{ ok: true }> {
  return postJson<{ ok: true }>('/api/rooms/confirm', payload);
}

export async function updateSettings(payload: {
  roomCode: string;
  clientId: string;
  settings: { mafiaCount: number; doctor: boolean; detective: boolean; lady: boolean; casualMode: boolean; customRoles: { name: string; count: number }[] };
}): Promise<{ ok: true }> {
  return postJson<{ ok: true }>('/api/rooms/settings', payload);
}

export async function resetGame(payload: {
  roomCode: string;
  clientId: string;
}): Promise<{ ok: true }> {
  return postJson<{ ok: true }>('/api/rooms/reset', payload);
}

export async function leaveRoom(payload: {
  roomCode: string;
  clientId: string;
}): Promise<{ ok: true }> {
  return postJson<{ ok: true }>('/api/rooms/leave', payload);
}

export async function startRound(payload: {
  roomCode: string;
  clientId: string;
}): Promise<{ ok: true }> {
  return postJson<{ ok: true }>('/api/rooms/round/start', payload);
}

export async function submitRoundAction(payload: {
  roomCode: string;
  clientId: string;
  targetId: string;
}): Promise<{ ok: true }> {
  return postJson<{ ok: true }>('/api/rooms/round/action', payload);
}

export async function resolveRound(payload: {
  roomCode: string;
  clientId: string;
}): Promise<{ ok: true }> {
  return postJson<{ ok: true }>('/api/rooms/round/resolve', payload);
}

export async function finishVoting(payload: {
  roomCode: string;
  clientId: string;
  targetId?: string;
}): Promise<{ ok: true }> {
  return postJson<{ ok: true }>('/api/rooms/round/vote', payload);
}

export async function sendGraveyardMessage(payload: {
  roomCode: string;
  clientId: string;
  message: string;
}): Promise<{ ok: true }> {
  return postJson<{ ok: true }>('/api/rooms/round/action', payload);
}

export async function sendMafiaMessage(payload: {
  roomCode: string;
  clientId: string;
  message: string;
}): Promise<{ ok: true }> {
  return postJson<{ ok: true }>('/api/rooms/round/action', {
    ...payload,
    chatScope: 'mafia',
  });
}
