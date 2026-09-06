import React from 'react';
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
  const currentRole = role || Role.VILLAGER;

  if (phase === 'REVEAL') {
    return (
      <div className="text-center space-y-6 sm:space-y-8">
        <p className="text-sm text-[color:var(--ink-muted)] italic">Your secret role is...</p>

        <div className="relative overflow-hidden rounded-[28px] border border-[color:var(--line)] bg-[var(--surface-strong)] px-6 py-10 sm:py-12 group select-none">
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--surface-strong)] transition-opacity duration-300 group-active:opacity-0">
            <span className="title-font text-base uppercase tracking-[0.24em] sm:tracking-[0.4em] text-[color:var(--ink-muted)] select-none">
              Hold to reveal
            </span>
          </div>

          <div className="relative flex flex-col items-center">
            <div className="text-6xl mb-4">{getRoleIcon(currentRole)}</div>
            <h3 className="title-font break-words text-center text-3xl text-[color:var(--ink)] uppercase tracking-tight">
              {currentRole}
            </h3>
            <p className="mt-3 text-xs text-[color:var(--ink-muted)] px-4">
              {getRoleDescription(currentRole)}
            </p>
          </div>
        </div>

        <button
          onClick={onConfirmRole}
          disabled={isBusy}
          className="w-full rounded-2xl bg-[var(--ink)] text-[color:var(--paper)] font-semibold py-4 uppercase tracking-[0.3em] text-xs disabled:opacity-60 hover:opacity-90 transition"
        >
          I have seen my role
        </button>
      </div>
    );
  }

  return (
    <div className="text-center space-y-5 sm:space-y-6 py-4 sm:py-6">
      <div className="flex justify-center space-x-2">
        <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-bounce"></div>
        <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
        <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
      </div>
      <h2 className="title-font text-2xl text-[color:var(--ink)]">Waiting for everyone...</h2>
      <div className="rounded-2xl border border-[color:var(--line)] bg-[var(--surface)] p-4 space-y-2">
        {players.map((player) => (
          <div
            key={player.id}
            className="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.16em] sm:tracking-[0.35em]"
          >
            <span
              className={`min-w-0 flex-1 break-words text-left font-semibold ${
                player.hasConfirmed ? 'text-emerald-600' : 'text-[color:var(--ink-soft)]'
              }`}
            >
              {player.name}
            </span>
            {player.hasConfirmed ? (
              <i className="fas fa-check text-[10px] text-emerald-600"></i>
            ) : (
              <i className="fas fa-clock text-[10px] text-[color:var(--ink-soft)]"></i>
            )}
          </div>
        ))}
      </div>
      <button
        onClick={onLeaveRoom}
        className="w-full rounded-2xl border border-red-500/40 bg-red-600 py-3 text-[10px] font-semibold uppercase tracking-[0.2em] sm:tracking-[0.35em] text-white hover:bg-red-500 transition"
      >
        Leave room
      </button>
    </div>
  );
};
