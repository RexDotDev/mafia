export enum Role {
  MAFIA = 'Mafija',
  VILLAGER = 'Građanin',
  DOCTOR = 'Doktor',
  DETECTIVE = 'Inspektor',
  LADY = 'Dama',
  NARRATOR = 'Narator'
}

export enum GamePhase {
  JOIN = 'JOIN',
  LOBBY = 'LOBBY',
  REVEAL = 'REVEAL',
  WAITING_FOR_OTHERS = 'WAITING_FOR_OTHERS',
  READY_TO_PLAY = 'READY_TO_PLAY'
}

export interface CustomRoleSetting {
  name: string;
  count: number;
}

export interface Player {
  id: string;
  clientId: string;
  name: string;
  role?: Role | string;
  hasConfirmed: boolean;
  isHost: boolean;
  isNarrator: boolean;
}

export interface RoomSettings {
  mafiaCount: number;
  doctor: boolean;
  detective: boolean;
  lady: boolean;
  customRoles: CustomRoleSetting[];
}

export interface RoomData {
  id: string;
  players: Player[];
  status: 'waiting' | 'started' | 'finished';
  settings: RoomSettings;
}
