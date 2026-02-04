export enum Role {
  MAFIA = 'Mafija',
  VILLAGER = 'Građanin',
  DOCTOR = 'Doktor',
  DETECTIVE = 'Inspektor'
}

export enum GamePhase {
  JOIN = 'JOIN',
  LOBBY = 'LOBBY',
  REVEAL = 'REVEAL',
  WAITING_FOR_OTHERS = 'WAITING_FOR_OTHERS',
  READY_TO_PLAY = 'READY_TO_PLAY'
}

export interface Player {
  id: string;
  clientId: string;
  name: string;
  role?: Role;
  hasConfirmed: boolean;
  isHost: boolean;
}

export interface RoomSettings {
  mafiaCount: number;
  doctor: boolean;
  detective: boolean;
}

export interface RoomData {
  id: string;
  players: Player[];
  status: 'waiting' | 'started' | 'finished';
  settings: RoomSettings;
}
