import React from 'react';
import { RoundVoteSummary } from '../../types';

interface VoteSummaryModalProps {
  isOpen: boolean;
  voteSummary: RoundVoteSummary | null;
  onClose: () => void;
}

export const VoteSummaryModal: React.FC<VoteSummaryModalProps> = ({
  isOpen,
  voteSummary,
  onClose,
}) => {
  if (!isOpen || !voteSummary) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 px-4 py-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl border border-[color:var(--line)] bg-[var(--surface)] p-5 text-left shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
            Voting result
          </p>
          <h3 className="title-font text-2xl text-[color:var(--ink)]">
            {voteSummary.eliminatedPlayerName
              ? `${voteSummary.eliminatedPlayerName} was eliminated`
              : 'No player was eliminated'}
          </h3>
        </div>

        <div className="text-xs text-[color:var(--ink-muted)]">
          Votes submitted: {voteSummary.completedVoters}/{voteSummary.totalVoters}
        </div>

        <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
          {voteSummary.voteCounts.map((entry) => (
            <div
              key={entry.playerId}
              className="flex items-center justify-between rounded-lg border border-[color:var(--line)] bg-[var(--surface-strong)] px-3 py-2 text-sm text-[color:var(--ink-muted)]"
            >
              <span>{entry.playerName}</span>
              <span className="font-semibold text-[color:var(--ink)]">{entry.votes}</span>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full rounded-xl bg-[var(--ink)] py-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--paper)] hover:opacity-90 transition"
        >
          Continue
        </button>
      </div>
    </div>
  );
};
