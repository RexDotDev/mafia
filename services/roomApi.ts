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

export async function joinRoom(payload: {
  roomCode: string;
  playerName: string;
  clientId: string;
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
  settings: { mafiaCount: number; doctor: boolean; detective: boolean };
}): Promise<{ ok: true }> {
  return postJson<{ ok: true }>('/api/rooms/settings', payload);
}
