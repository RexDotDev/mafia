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

  const totalVotesCast = voteSummary.completedVoters;
  const maxVotes = Math.max(1, ...voteSummary.voteCounts.map((v) => v.votes));

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center backdrop-blur-md bg-black/65 px-4 py-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-[color:var(--line)] bg-[var(--surface)] p-6 text-left shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-[color:var(--line)] pb-3">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[color:var(--ink-faint)] mb-1">
            <i className="fas fa-gavel text-amber-500"></i>
            <span>Town Trial Results</span>
          </div>
          <h3 className="font-display text-xl sm:text-2xl font-bold text-[color:var(--ink)] tracking-tight">
            {voteSummary.eliminatedPlayerName ? (
              <span className="text-red-600 dark:text-red-400">
                {voteSummary.eliminatedPlayerName} was voted out
              </span>
            ) : (
              <span>No Player Was Eliminated</span>
            )}
          </h3>
          <p className="text-xs text-[color:var(--ink-muted)] mt-1">
            {totalVotesCast} living players submitted their verdict.
          </p>
        </div>

        {/* Vote Counts Meter */}
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {voteSummary.voteCounts.length > 0 ? (
            voteSummary.voteCounts.map((entry) => {
              const isEliminated = entry.playerId === voteSummary.eliminatedPlayerId;
              const barWidth = Math.round((entry.votes / maxVotes) * 100);

              return (
                <div
                  key={entry.playerId}
                  className={`rounded-xl p-3 border text-xs space-y-1.5 transition-colors ${
                    isEliminated
                      ? 'border-red-500/30 bg-red-500/10'
                      : 'border-[color:var(--line)] bg-[var(--surface-soft)]'
                  }`}
                >
                  <div className="flex items-center justify-between font-medium">
                    <span className={`font-semibold ${isEliminated ? 'text-red-600 dark:text-red-400' : 'text-[color:var(--ink)]'}`}>
                      {entry.playerName}
                      {isEliminated && ' (Eliminated)'}
                    </span>
                    <span className="font-mono font-bold text-[color:var(--ink)]">
                      {entry.votes} {entry.votes === 1 ? 'vote' : 'votes'}
                    </span>
                  </div>

                  {/* Relative vote bar */}
                  <div className="h-1.5 w-full rounded-full bg-[var(--surface-strong)] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isEliminated ? 'bg-red-600' : 'bg-[color:var(--ink-muted)]'
                      }`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-xs text-[color:var(--ink-muted)] italic">No votes were cast this round.</p>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-xl bg-[var(--ink)] text-[var(--paper)] py-3 px-4 text-xs font-semibold tracking-wide hover:opacity-90 transition btn-tactile"
        >
          Proceed to Next Phase
        </button>
      </div>
    </div>
  );
};
