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

export type RoundPhase = 'idle' | 'night' | 'voting';

export type RoundActionType = 'mafia_kill' | 'doctor_heal' | 'detective_check' | 'lady_silence';

export interface RoundAction {
  actorId: string;
  actorName: string;
  role: string;
  type: RoundActionType;
  targetId: string;
  targetName: string;
  createdAt: string;
}

export interface RoundResult {
  mafiaTargetId: string | null;
  killedPlayerId: string | null;
  doctorTargetId: string | null;
  doctorSaved: boolean;
  ladyTargetId: string | null;
  inspectorTargetId: string | null;
  inspectorIsMafia: boolean | null;
  mutedPlayerId: string | null;
}

export interface RoundEvent {
  id: string;
  round: number;
  type:
    | 'round_started'
    | 'mafia_kill'
    | 'doctor_heal'
    | 'detective_check'
    | 'lady_silence'
    | 'vote_elimination'
    | 'note';
  message: string;
  createdAt: string;
}

export interface RoundVote {
  voterId: string;
  voterName: string;
  targetId: string;
  targetName: string;
  createdAt: string;
}

export interface RoundVoteSummary {
  totalVoters: number;
  completedVoters: number;
  eliminatedPlayerId: string | null;
  eliminatedPlayerName: string | null;
  voteCounts: Array<{
    playerId: string;
    playerName: string;
    votes: number;
  }>;
}

export interface GraveyardMessage {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  createdAt: string;
}

export interface RoundState {
  round: number;
  phase: RoundPhase;
  actions: RoundAction[];
  votes: RoundVote[];
  events: RoundEvent[];
  eliminatedPlayerIds: string[];
  lastResult: RoundResult | null;
  lastVoteSummary: RoundVoteSummary | null;
  graveyardMessages: GraveyardMessage[];
}

export interface RoomData {
  id: string;
  players: Player[];
  status: 'waiting' | 'started' | 'finished';
  settings: RoomSettings;
  roundState: RoundState | null;
}
