import React from 'react';
import { Player, RoundVote } from '../types';

interface VotingCardProps {
  targetId: string;
  alivePlayers: Player[];
  votedPlayers: (Player | RoundVote)[];
  pendingVoters: Player[];
  mySubmittedVote?: RoundVote;
  isBusy: boolean;
  onTargetChange: (id: string) => void;
  onSubmitVote: () => void;
}

export const VotingCard: React.FC<VotingCardProps> = ({
  targetId,
  alivePlayers,
  votedPlayers,
  pendingVoters,
  mySubmittedVote,
  isBusy,
  onTargetChange,
  onSubmitVote,
}) => {
  const votePercentage =
    alivePlayers.length > 0 ? Math.round((votedPlayers.length / alivePlayers.length) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Voting Phase Header */}
      <div className="text-left space-y-1">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <i className="fas fa-gavel text-[9px]"></i>
            Town Trial
          </span>
          <span className="text-xs font-semibold text-[color:var(--ink-muted)]">
            Open Day Voting
          </span>
        </div>
        <h2 className="font-display text-xl sm:text-2xl font-bold text-[color:var(--ink)] tracking-tight">
          Cast Your Accusation
        </h2>
        <p className="text-xs text-[color:var(--ink-muted)]">
          Vote to eliminate a suspected Mafia member. Results are revealed once all living players cast their ballot.
        </p>
      </div>

      {/* Ballot Card */}
      <div className="rounded-xl border border-[color:var(--line)] bg-[var(--surface-soft)] p-4 space-y-4 text-left">
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-[color:var(--ink-muted)]">
            Select Suspect to Eliminate
          </label>
          <div className="relative">
            <select
              value={targetId}
              onChange={(e) => onTargetChange(e.target.value)}
              className="w-full rounded-xl border border-[color:var(--line)] bg-[var(--surface-strong)] px-3.5 py-3 text-sm text-[color:var(--ink)] focus:outline-none focus:border-red-500/60 focus:ring-2 focus:ring-red-500/20 transition cursor-pointer appearance-none"
            >
              <option value="">Choose a player to vote out...</option>
              {alivePlayers.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.name}
                </option>
              ))}
            </select>
            <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-[color:var(--ink-faint)]">
              <i className="fas fa-chevron-down text-xs"></i>
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onSubmitVote}
          disabled={isBusy || !targetId}
          className="w-full rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 text-xs sm:text-sm tracking-wide shadow-xs hover:shadow transition disabled:opacity-40 btn-tactile flex items-center justify-center gap-2"
        >
          <i className="fas fa-check-to-slot text-xs"></i>
          <span>Submit Ballot</span>
        </button>

        {mySubmittedVote && (
          <div className="rounded-lg bg-[var(--surface-strong)] border border-[color:var(--line)] p-2.5 flex items-center justify-between text-xs">
            <span className="text-[color:var(--ink-muted)]">Your current vote:</span>
            <span className="font-semibold text-red-600 dark:text-red-400 font-mono">
              {mySubmittedVote.targetName}
            </span>
          </div>
        )}

        {/* Voting Progress Meter */}
        <div className="space-y-2 pt-2 border-t border-[color:var(--line)]">
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="text-[color:var(--ink-muted)]">Ballots Counted:</span>
            <span className="font-mono text-[color:var(--ink)] font-bold">
              {votedPlayers.length} of {alivePlayers.length} ({votePercentage}%)
            </span>
          </div>

          <div className="h-2 w-full rounded-full bg-[var(--surface-strong)] border border-[color:var(--line)] overflow-hidden">
            <div
              className="h-full bg-red-600 rounded-full transition-all duration-300"
              style={{ width: `${votePercentage}%` }}
            />
          </div>

          <div className="text-[11px] text-[color:var(--ink-faint)] leading-tight">
            {pendingVoters.length > 0 ? (
              <span>
                Waiting on:{' '}
                <span className="text-[color:var(--ink-muted)] font-medium">
                  {pendingVoters.map((p) => p.name).join(', ')}
                </span>
              </span>
            ) : (
              <span className="text-emerald-600 font-semibold flex items-center gap-1">
                <i className="fas fa-check text-[10px]"></i>
                All votes submitted! Calculating result...
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
