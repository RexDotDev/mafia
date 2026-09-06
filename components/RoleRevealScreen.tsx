import React, { useState } from 'react';
import { Player, Role } from '../types';
import { getRoleDescription, getRoleIcon } from '../constants';

interface RoleRevealScreenProps {
  phase: 'REVEAL' | 'WAITING_FOR_OTHERS';
  role?: string;
  players: Player[];
  isBusy: boolean;
  onConfirmRole: () => void;
  onLeaveRoom: () => void;
}

export const RoleRevealScreen: React.FC<RoleRevealScreenProps> = ({
  phase,
  role,
  players,
  isBusy,
  onConfirmRole,
  onLeaveRoom,
}) => {
  const [isRevealed, setIsRevealed] = useState(false);
  const currentRole = role || Role.VILLAGER;

  const getRoleTheme = (roleName: string) => {
    switch (roleName) {
      case Role.MAFIA:
        return {
          bg: 'bg-red-500/10 dark:bg-red-500/15',
          text: 'text-red-600 dark:text-red-400',
          border: 'border-red-500/25',
          label: 'Underworld Threat',
        };
      case Role.DOCTOR:
        return {
          bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
          text: 'text-emerald-600 dark:text-emerald-400',
          border: 'border-emerald-500/25',
          label: 'Town Guardian',
        };
      case Role.DETECTIVE:
        return {
          bg: 'bg-amber-500/10 dark:bg-amber-500/15',
          text: 'text-amber-600 dark:text-amber-400',
          border: 'border-amber-500/25',
          label: 'Chief Investigator',
        };
      case Role.LADY:
        return {
          bg: 'bg-rose-500/10 dark:bg-rose-500/15',
          text: 'text-rose-600 dark:text-rose-400',
          border: 'border-rose-500/25',
          label: 'Night Silencer',
        };
      default:
        return {
          bg: 'bg-slate-500/10 dark:bg-slate-500/15',
          text: 'text-[color:var(--ink)]',
          border: 'border-[color:var(--line)]',
          label: 'Town Resident',
        };
    }
  };

  const theme = getRoleTheme(currentRole);

  if (phase === 'REVEAL') {
    return (
      <div className="space-y-6 text-center">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-500/10 text-red-600 border border-red-500/20 mb-2">
            Top Secret Dossier
          </span>
          <h2 className="font-display text-2xl font-bold text-[color:var(--ink)] tracking-tight">
            Your Secret Identity
          </h2>
          <p className="mt-1 text-xs text-[color:var(--ink-muted)]">
            Keep your screen hidden from adjacent players.
          </p>
        </div>

        {/* Dossier Card with Interactive Reveal */}
        <div className="relative rounded-2xl border border-[color:var(--line)] bg-[var(--surface-strong)] overflow-hidden shadow-sm p-6 sm:p-8">
          {/* Cover Veil */}
          {!isRevealed && (
            <div
              className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[var(--surface-strong)] p-6 cursor-pointer select-none transition-all duration-200"
              onClick={() => setIsRevealed(true)}
              onPointerDown={() => setIsRevealed(true)}
            >
              <div className="h-16 w-16 rounded-2xl bg-red-500/10 text-red-600 flex items-center justify-center mb-3.5 border border-red-500/20">
                <i className="fas fa-fingerprint text-2xl"></i>
              </div>
              <p className="font-display text-base font-bold tracking-wide uppercase text-[color:var(--ink)]">
                Tap to Reveal Identity
              </p>
              <p className="text-xs text-[color:var(--ink-muted)] mt-1 max-w-xs text-center">
                Reveals your assignment and night abilities.
              </p>
            </div>
          )}

          {/* Secret Role Content */}
          <div className="flex flex-col items-center py-2">
            <div
              className={`h-20 w-20 rounded-2xl flex items-center justify-center text-4xl mb-4 border shadow-xs ${theme.bg} ${theme.text} ${theme.border}`}
            >
              {getRoleIcon(currentRole)}
            </div>

            <span className={`text-[11px] font-bold uppercase tracking-wider mb-1 ${theme.text}`}>
              {theme.label}
            </span>

            <h3 className="font-display text-3xl sm:text-4xl font-extrabold text-[color:var(--ink)] tracking-tight">
              {currentRole}
            </h3>

            <p className="mt-3 text-xs sm:text-sm text-[color:var(--ink-muted)] max-w-md text-center leading-relaxed">
              {getRoleDescription(currentRole)}
            </p>

            {isRevealed && (
              <button
                type="button"
                onClick={() => setIsRevealed(false)}
                className="mt-4 text-[11px] font-medium text-[color:var(--ink-faint)] hover:text-[color:var(--ink)] transition flex items-center gap-1.5"
              >
                <i className="fas fa-eye-slash text-xs"></i>
                <span>Hide identity</span>
              </button>
            )}
          </div>
        </div>

        {/* Confirmation Button */}
        <button
          type="button"
          onClick={onConfirmRole}
          disabled={isBusy}
          className="w-full rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold py-3.5 px-6 text-sm tracking-wide shadow-sm hover:shadow transition disabled:opacity-40 btn-tactile flex items-center justify-center gap-2"
        >
          <i className="fas fa-check text-xs"></i>
          <span>I Have Memorized My Role</span>
        </button>
      </div>
    );
  }

  // WAITING_FOR_OTHERS phase
  const confirmedCount = players.filter((p) => p.hasConfirmed).length;
  const totalCount = players.filter((p) => !p.isNarrator).length;

  return (
    <div className="space-y-6 text-center py-2">
      <div className="space-y-2">
        {/* Minimalist radar sync indicator */}
        <div className="relative h-12 w-12 mx-auto flex items-center justify-center">
          <span className="absolute h-12 w-12 rounded-full bg-emerald-500/10 animate-ping"></span>
          <span className="h-10 w-10 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center border border-emerald-500/30">
            <i className="fas fa-satellite-dish text-sm"></i>
          </span>
        </div>

        <h2 className="font-display text-2xl font-bold text-[color:var(--ink)] tracking-tight">
          Waiting for Players...
        </h2>
        <p className="text-xs text-[color:var(--ink-muted)]">
          {confirmedCount} of {totalCount} players have confirmed their role.
        </p>
      </div>

      {/* Synchronized Player Checklist */}
      <div className="rounded-xl border border-[color:var(--line)] bg-[var(--surface-strong)] overflow-hidden shadow-xs text-left">
        <div className="divide-y divide-[color:var(--line)] max-h-60 overflow-y-auto">
          {players
            .filter((player) => !player.isNarrator)
            .map((player) => (
              <div
                key={player.id}
                className="flex items-center justify-between gap-3 px-4 py-3 text-xs"
              >
                <span
                  className={`font-medium ${
                    player.hasConfirmed ? 'text-[color:var(--ink)]' : 'text-[color:var(--ink-muted)]'
                  }`}
                >
                  {player.name}
                </span>

                {player.hasConfirmed ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                    <i className="fas fa-check text-[10px]"></i>
                    <span>Ready</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-[color:var(--ink-faint)]">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                    <span>Reviewing role</span>
                  </span>
                )}
              </div>
            ))}
        </div>
      </div>

      <button
        type="button"
        onClick={onLeaveRoom}
        className="w-full py-2.5 rounded-xl border border-[color:var(--line)] text-xs font-medium text-[color:var(--ink-muted)] hover:text-red-600 hover:border-red-500/30 hover:bg-red-500/5 transition btn-tactile"
      >
        Leave Room
      </button>
    </div>
  );
};
