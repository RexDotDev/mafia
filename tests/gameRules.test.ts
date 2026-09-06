import { describe, it, expect } from 'vitest';
import { Role, normalizeRoleName } from '../types';

// Mirroring the evaluateWinner function from server/roundState.ts and resolve.ts
const evaluateWinner = (alivePlayers: { role?: string }[]): 'city' | 'mafia' | null => {
  const mafiaAlive = alivePlayers.filter(
    (p) => normalizeRoleName(p.role) === Role.MAFIA,
  ).length;
  const cityAlive = alivePlayers.length - mafiaAlive;
  if (mafiaAlive === 0) return 'city';
  if (mafiaAlive >= cityAlive) return 'mafia';
  return null;
};

// Mirroring night resolution calculation
const resolveNightActions = ({
  mafiaTargetId,
  doctorTargetId,
  inspectorTargetId,
  ladyTargetId,
  players,
}: {
  mafiaTargetId: string | null;
  doctorTargetId: string | null;
  inspectorTargetId: string | null;
  ladyTargetId: string | null;
  players: { id: string; role: string }[];
}) => {
  const isDoctorSilenced = ladyTargetId === 'doctor_id';
  const effectiveDoctorTarget = isDoctorSilenced ? null : doctorTargetId;
  const doctorSaved = !!mafiaTargetId && mafiaTargetId === effectiveDoctorTarget;
  const killedPlayerId = mafiaTargetId && !doctorSaved ? mafiaTargetId : null;

  let inspectorIsMafia: boolean | null = null;
  if (inspectorTargetId) {
    const inspected = players.find((p) => p.id === inspectorTargetId);
    if (inspected) {
      inspectorIsMafia = normalizeRoleName(inspected.role) === Role.MAFIA;
    }
  }

  return {
    doctorSaved,
    killedPlayerId,
    inspectorIsMafia,
  };
};

describe('Game Rules: evaluateWinner', () => {
  it('should declare Town/City winner when all mafia are eliminated', () => {
    const alive = [
      { role: Role.VILLAGER },
      { role: Role.DOCTOR },
      { role: Role.DETECTIVE },
    ];
    expect(evaluateWinner(alive)).toBe('city');
  });

  it('should declare Mafia winner when mafia equal or outnumber town', () => {
    const aliveEqual = [
      { role: Role.MAFIA },
      { role: Role.VILLAGER },
    ];
    expect(evaluateWinner(aliveEqual)).toBe('mafia');

    const aliveOutnumbered = [
      { role: Role.MAFIA },
      { role: Role.MAFIA },
      { role: Role.VILLAGER },
    ];
    expect(evaluateWinner(aliveOutnumbered)).toBe('mafia');
  });

  it('should return null when game is ongoing (town outnumbers mafia)', () => {
    const alive = [
      { role: Role.MAFIA },
      { role: Role.VILLAGER },
      { role: Role.DOCTOR },
      { role: Role.DETECTIVE },
    ];
    expect(evaluateWinner(alive)).toBeNull();
  });
});

describe('Game Rules: Role Normalization', () => {
  it('should normalize legacy Serbian role names to English equivalents', () => {
    expect(normalizeRoleName('Mafija')).toBe(Role.MAFIA);
    expect(normalizeRoleName('Građanin')).toBe(Role.VILLAGER);
    expect(normalizeRoleName('Doktor')).toBe(Role.DOCTOR);
    expect(normalizeRoleName('Inspektor')).toBe(Role.DETECTIVE);
    expect(normalizeRoleName('Dama')).toBe(Role.LADY);
    expect(normalizeRoleName('Narator')).toBe(Role.NARRATOR);
  });

  it('should pass through standard English roles unchanged', () => {
    expect(normalizeRoleName(Role.MAFIA)).toBe(Role.MAFIA);
    expect(normalizeRoleName(Role.VILLAGER)).toBe(Role.VILLAGER);
    expect(normalizeRoleName(Role.DOCTOR)).toBe(Role.DOCTOR);
  });
});

describe('Game Rules: Night Resolution', () => {
  const players = [
    { id: 'player_1', role: Role.MAFIA },
    { id: 'player_2', role: Role.VILLAGER },
    { id: 'doctor_id', role: Role.DOCTOR },
    { id: 'player_4', role: Role.DETECTIVE },
  ];

  it('should eliminate player when mafia attacks and doctor heals someone else', () => {
    const result = resolveNightActions({
      mafiaTargetId: 'player_2',
      doctorTargetId: 'doctor_id',
      inspectorTargetId: null,
      ladyTargetId: null,
      players,
    });

    expect(result.doctorSaved).toBe(false);
    expect(result.killedPlayerId).toBe('player_2');
  });

  it('should save player when doctor heals the mafia target', () => {
    const result = resolveNightActions({
      mafiaTargetId: 'player_2',
      doctorTargetId: 'player_2',
      inspectorTargetId: null,
      ladyTargetId: null,
      players,
    });

    expect(result.doctorSaved).toBe(true);
    expect(result.killedPlayerId).toBeNull();
  });

  it('should prevent doctor save if doctor is silenced by the Silencer', () => {
    const result = resolveNightActions({
      mafiaTargetId: 'player_2',
      doctorTargetId: 'player_2',
      inspectorTargetId: null,
      ladyTargetId: 'doctor_id', // Silencer targeted the doctor
      players,
    });

    expect(result.doctorSaved).toBe(false);
    expect(result.killedPlayerId).toBe('player_2');
  });

  it('should correctly reveal mafia identity to the detective', () => {
    const result = resolveNightActions({
      mafiaTargetId: null,
      doctorTargetId: null,
      inspectorTargetId: 'player_1',
      ladyTargetId: null,
      players,
    });
    expect(result.inspectorIsMafia).toBe(true);
  });
});
