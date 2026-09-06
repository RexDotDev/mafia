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
  return (
    <div className="space-y-4">
      <div>
        <h2 className="title-font text-3xl text-[color:var(--ink)]">Voting is in progress</h2>
        <p className="mt-2 text-sm text-[color:var(--ink-muted)]">
          Choose a suspect and cast your vote. Results are revealed once all living players vote.
        </p>
      </div>

      <div className="rounded-2xl border border-[color:var(--line)] bg-[var(--surface)] p-4 text-left space-y-3">
        <p className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-faint)]">
          Town vote
        </p>

        <select
          value={targetId}
          onChange={(e) => onTargetChange(e.target.value)}
          className="w-full rounded-xl border border-[color:var(--line)] bg-[var(--surface-strong)] px-3 py-2 text-sm text-[color:var(--ink)] focus:outline-none focus:ring-2 focus:ring-red-400/50"
        >
          <option value="">Select a player</option>
          {alivePlayers.map((player) => (
            <option key={player.id} value={player.id}>
              {player.name}
            </option>
          ))}
        </select>

        <button
          onClick={onSubmitVote}
          disabled={isBusy || !targetId}
          className="w-full rounded-xl bg-[var(--ink)] py-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--paper)] hover:opacity-90 disabled:opacity-60 transition"
        >
          Confirm vote
        </button>

        {mySubmittedVote && (
          <p className="text-xs text-[color:var(--ink-muted)]">
            Your vote: <strong>{mySubmittedVote.targetName}</strong>
          </p>
        )}

        <div className="text-xs text-[color:var(--ink-muted)] pt-1">
          Votes submitted: <strong>{votedPlayers.length}/{alivePlayers.length}</strong>
        </div>

        <div className="text-xs text-[color:var(--ink-muted)]">
          Waiting on:{' '}
          <span className="italic">
            {pendingVoters.length
              ? pendingVoters.map((player) => player.name).join(', ')
              : 'everyone has voted'}
          </span>
        </div>
      </div>
    </div>
  );
};
