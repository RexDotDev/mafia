import React from 'react';
import { Player } from '../types';

interface NightActionCardProps {
  role?: string;
  targetId: string;
  availableTargets: Player[];
  lastSubmittedTargetName?: string;
  isBusy: boolean;
  onTargetChange: (id: string) => void;
  onSubmit: () => void;
}

export const NightActionCard: React.FC<NightActionCardProps> = ({
  role,
  targetId,
  availableTargets,
  lastSubmittedTargetName,
  isBusy,
  onTargetChange,
  onSubmit,
}) => {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="title-font text-3xl text-[color:var(--ink)]">Night action</h2>
        <p className="mt-2 text-sm text-[color:var(--ink-muted)]">
          Choose a target and submit your action for the night.
        </p>
      </div>

      <div className="rounded-2xl border border-[color:var(--line)] bg-[var(--surface)] p-4 text-left space-y-3">
        <p className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-faint)]">
          Your role: <strong className="text-[color:var(--ink)]">{role}</strong>
        </p>

        <select
          value={targetId}
          onChange={(e) => onTargetChange(e.target.value)}
          className="w-full rounded-xl border border-[color:var(--line)] bg-[var(--surface-strong)] px-3 py-2 text-sm text-[color:var(--ink)] focus:outline-none focus:ring-2 focus:ring-red-400/50"
        >
          <option value="">Select a player</option>
          {availableTargets.map((player) => (
            <option key={player.id} value={player.id}>
              {player.name}
            </option>
          ))}
        </select>

        <button
          onClick={onSubmit}
          disabled={isBusy || !targetId}
          className="w-full rounded-xl bg-[var(--ink)] py-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--paper)] hover:opacity-90 disabled:opacity-60 transition"
        >
          Submit action
        </button>

        {lastSubmittedTargetName && (
          <p className="text-xs text-[color:var(--ink-muted)]">
            Last chosen target: <strong>{lastSubmittedTargetName}</strong>
          </p>
        )}
      </div>
    </div>
  );
};
