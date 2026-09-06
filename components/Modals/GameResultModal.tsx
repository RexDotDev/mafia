import React from 'react';
import { RoundGameResult } from '../../types';

interface GameResultModalProps {
  isOpen: boolean;
  gameResult: RoundGameResult | null;
  onClose: () => void;
}

export const GameResultModal: React.FC<GameResultModalProps> = ({
  isOpen,
  gameResult,
  onClose,
}) => {
  if (!isOpen || !gameResult) return null;

  const isCityWin = gameResult.winner === 'city';
  const title = isCityWin ? 'The Town Triumphs' : 'The Mafia Wins';

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center backdrop-blur-md bg-black/70 px-4 py-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-[color:var(--line)] bg-[var(--surface)] p-6 sm:p-7 text-center shadow-2xl relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Accent banner */}
        <div
          className={`h-1.5 absolute top-0 inset-x-0 ${
            isCityWin ? 'bg-emerald-500' : 'bg-red-600'
          }`}
        />

        {/* Emblem */}
        <div
          className={`h-16 w-16 mx-auto rounded-2xl flex items-center justify-center text-3xl mb-4 border ${
            isCityWin
              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/25'
              : 'bg-red-500/10 text-red-600 border-red-500/25'
          }`}
        >
          <i className={`fas ${isCityWin ? 'fa-shield-heart' : 'fa-skull'}`}></i>
        </div>

        <span className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--ink-faint)]">
          Game Verdict · Round {gameResult.round || 1}
        </span>

        <h3 className="mt-1 font-display text-2xl sm:text-3xl font-extrabold text-[color:var(--ink)] tracking-tight">
          {title}
        </h3>

        <p className="mt-2.5 text-xs sm:text-sm text-[color:var(--ink-muted)] leading-relaxed px-2">
          {gameResult.message || (isCityWin ? 'All Mafia threats have been eliminated from the town.' : 'The Mafia has successfully taken control of the town.')}
        </p>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-xl bg-[var(--ink)] text-[var(--paper)] py-3 px-4 text-xs font-semibold tracking-wide hover:opacity-90 transition btn-tactile"
        >
          View Final Roster
        </button>
      </div>
    </div>
  );
};
