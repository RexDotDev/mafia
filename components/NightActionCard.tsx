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
    <div className="space-y-5">
      {/* Night Header */}
      <div className="text-left space-y-1">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            <i className="fas fa-moon text-[9px]"></i>
            Night Phase
          </span>
          <span className="text-xs font-semibold text-[color:var(--ink)]">
            Role: <span className="text-red-600 font-bold">{role}</span>
          </span>
        </div>
        <h2 className="font-display text-xl sm:text-2xl font-bold text-[color:var(--ink)] tracking-tight">
          Select Tonight's Target
        </h2>
        <p className="text-xs text-[color:var(--ink-muted)]">
          Choose a player to carry out your special assignment under cover of darkness.
        </p>
      </div>

      {/* Target Selector Card */}
      <div className="rounded-xl border border-[color:var(--line)] bg-[var(--surface-soft)] p-4 space-y-3.5 text-left">
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-[color:var(--ink-muted)]">
            Available Targets ({availableTargets.length})
          </label>
          <div className="relative">
            <select
              value={targetId}
              onChange={(e) => onTargetChange(e.target.value)}
              className="w-full rounded-xl border border-[color:var(--line)] bg-[var(--surface-strong)] px-3.5 py-3 text-sm text-[color:var(--ink)] focus:outline-none focus:border-red-500/60 focus:ring-2 focus:ring-red-500/20 transition cursor-pointer appearance-none"
            >
              <option value="">Select a player from town...</option>
              {availableTargets.map((player) => (
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
          onClick={onSubmit}
          disabled={isBusy || !targetId}
          className="w-full rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 text-xs sm:text-sm tracking-wide shadow-xs hover:shadow transition disabled:opacity-40 btn-tactile flex items-center justify-center gap-2"
        >
          <i className="fas fa-crosshairs text-xs"></i>
          <span>Confirm Night Action</span>
        </button>

        {lastSubmittedTargetName && (
          <div className="rounded-lg bg-[var(--surface-strong)] border border-[color:var(--line)] p-2.5 flex items-center justify-between text-xs">
            <span className="text-[color:var(--ink-muted)]">Current selection:</span>
            <span className="font-semibold text-red-600 dark:text-red-400 font-mono">
              {lastSubmittedTargetName}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
