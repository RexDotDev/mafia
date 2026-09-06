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

  const title = gameResult.winner === 'city' ? 'The town wins' : 'The Mafia wins';

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/65 px-4 py-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl border border-[color:var(--line)] bg-[var(--surface)] p-6 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
          Game over
        </p>
        <h3 className="mt-2 title-font text-3xl text-[color:var(--ink)]">{title}</h3>
        <p className="mt-2 text-sm text-[color:var(--ink-muted)]">
          {gameResult.message || title}
        </p>
        <button
          onClick={onClose}
          className="mt-5 w-full rounded-xl bg-[var(--ink)] py-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--paper)] hover:opacity-90 transition"
        >
          Continue
        </button>
      </div>
    </div>
  );
};
