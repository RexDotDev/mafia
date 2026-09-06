import React from 'react';
import { Player, RoomSettings } from '../types';
import { clampCustomRoleCount } from '../utils/gameUtils';

interface LobbyScreenProps {
  players: Player[];
  clientId: string;
  isHost: boolean;
  settings: RoomSettings;
  customRoleName: string;
  customRoleCount: number;
  isBusy: boolean;
  onCustomRoleNameChange: (val: string) => void;
  onCustomRoleCountChange: (val: number) => void;
  onMafiaCountChange: (delta: number) => void;
  onLadyToggle: () => void;
  onCasualModeToggle: () => void;
  onAddCustomRole: () => void;
  onCustomRoleUpdate: (index: number, delta: number) => void;
  onRemoveCustomRole: (index: number) => void;
  onStartGame: () => void;
  onLeaveRoom: () => void;
}

export const LobbyScreen: React.FC<LobbyScreenProps> = ({
  players,
  clientId,
  isHost,
  settings,
  customRoleName,
  customRoleCount,
  isBusy,
  onCustomRoleNameChange,
  onCustomRoleCountChange,
  onMafiaCountChange,
  onLadyToggle,
  onCasualModeToggle,
  onAddCustomRole,
  onCustomRoleUpdate,
  onRemoveCustomRole,
  onStartGame,
  onLeaveRoom,
}) => {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-[11px] uppercase tracking-[0.2em] sm:tracking-[0.35em] text-[color:var(--ink-faint)]">
          Players ({players.length})
        </h2>
        {isHost && (
          <span className="rounded-full bg-[var(--ink)] text-[color:var(--paper)] text-[10px] px-3 py-1 uppercase tracking-[0.2em] sm:tracking-[0.3em]">
            Host
          </span>
        )}
      </div>

      <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
        {players.map((player) => (
          <div
            key={player.id}
            className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-[color:var(--line)] bg-[var(--surface)] px-4 py-3"
          >
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[color:var(--ink)]">
              {player.name} {player.clientId === clientId && '(You)'}
            </span>
            <i className="fas fa-check-circle text-emerald-600 text-xs"></i>
          </div>
        ))}
      </div>

      {isHost ? (
        <div className="rounded-2xl border border-[color:var(--line)] bg-[var(--surface-soft)] p-4 space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[color:var(--ink-muted)]">Mafia members</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onMafiaCountChange(-1)}
                disabled={isBusy}
                className="h-9 w-9 rounded-xl border border-[color:var(--line)] bg-[var(--surface-strong)] text-sm font-semibold text-[color:var(--ink-muted)] hover:text-[color:var(--ink)] disabled:opacity-60"
              >
                -
              </button>
              <span className="w-8 text-center font-semibold text-[color:var(--ink)]">
                {settings.mafiaCount}
              </span>
              <button
                onClick={() => onMafiaCountChange(1)}
                disabled={isBusy}
                className="h-9 w-9 rounded-xl border border-[color:var(--line)] bg-[var(--surface-strong)] text-sm font-semibold text-[color:var(--ink-muted)] hover:text-[color:var(--ink)] disabled:opacity-60"
              >
                +
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-[color:var(--line)] bg-[var(--surface)] p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[color:var(--ink-muted)]">Silencer</span>
              <button
                type="button"
                onClick={onLadyToggle}
                disabled={isBusy}
                aria-pressed={settings.lady}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
                  settings.lady ? 'bg-red-600' : 'bg-[var(--surface-strong)] border border-[color:var(--line)]'
                } ${isBusy ? 'opacity-60' : ''}`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                    settings.lady ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-[color:var(--ink-faint)]">
              {settings.lady ? 'Enabled' : 'Disabled'}
            </p>
          </div>

          <div className="rounded-xl border border-[color:var(--line)] bg-[var(--surface)] p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[color:var(--ink-muted)]">Role-only mode</span>
              <button
                type="button"
                onClick={onCasualModeToggle}
                disabled={isBusy}
                aria-pressed={settings.casualMode}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
                  settings.casualMode ? 'bg-red-600' : 'bg-[var(--surface-strong)] border border-[color:var(--line)]'
                } ${isBusy ? 'opacity-60' : ''}`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                    settings.casualMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-[color:var(--ink-faint)]">
              {settings.casualMode ? 'Assign roles only' : 'Complete in-app game'}
            </p>
          </div>

          <div className="rounded-xl border border-[color:var(--line)] bg-[var(--surface)] p-3 space-y-3">
            <p className="text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.35em] text-[color:var(--ink-faint)]">
              Custom roles
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                className="flex-1 rounded-xl border border-[color:var(--line)] bg-[var(--surface)] px-3 py-2 text-xs text-[color:var(--ink)] placeholder:text-[color:var(--ink-soft)] focus:outline-none focus:ring-2 focus:ring-red-400/50"
                placeholder="Role name"
                value={customRoleName}
                onChange={(e) => onCustomRoleNameChange(e.target.value)}
              />
              <div className="flex items-center gap-1 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => onCustomRoleCountChange(clampCustomRoleCount(customRoleCount - 1))}
                  disabled={isBusy}
                  className="h-8 w-8 rounded-lg border border-[color:var(--line)] bg-[var(--surface)] text-xs font-semibold text-[color:var(--ink-muted)] hover:text-[color:var(--ink)] disabled:opacity-60"
                >
                  -
                </button>
                <span className="w-6 text-center text-xs font-semibold text-[color:var(--ink)]">
                  {customRoleCount}
                </span>
                <button
                  type="button"
                  onClick={() => onCustomRoleCountChange(clampCustomRoleCount(customRoleCount + 1))}
                  disabled={isBusy}
                  className="h-8 w-8 rounded-lg border border-[color:var(--line)] bg-[var(--surface)] text-xs font-semibold text-[color:var(--ink-muted)] hover:text-[color:var(--ink)] disabled:opacity-60"
                >
                  +
                </button>
              </div>
              <button
                type="button"
                onClick={onAddCustomRole}
                disabled={isBusy || !customRoleName.trim()}
                className="w-full rounded-lg border border-[color:var(--line)] bg-[var(--surface)] px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-[color:var(--ink-muted)] hover:text-[color:var(--ink)] disabled:opacity-60 sm:w-auto sm:tracking-[0.3em]"
              >
                Add
              </button>
            </div>

            {settings.customRoles.length > 0 && (
              <div className="space-y-2">
                {settings.customRoles.map((role, index) => (
                  <div
                    key={`${role.name}-${index}`}
                    className="flex min-w-0 flex-col gap-2 rounded-xl border border-[color:var(--line)] bg-[var(--surface)] px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="min-w-0 break-words text-sm font-semibold text-[color:var(--ink)]">
                      {role.name}
                    </span>
                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      <button
                        type="button"
                        onClick={() => onCustomRoleUpdate(index, -1)}
                        disabled={isBusy}
                        className="h-7 w-7 rounded-lg border border-[color:var(--line)] bg-[var(--surface)] text-[10px] font-semibold text-[color:var(--ink-muted)] hover:text-[color:var(--ink)] disabled:opacity-60"
                      >
                        -
                      </button>
                      <span className="w-5 text-center text-[10px] font-semibold text-[color:var(--ink)]">
                        {role.count}
                      </span>
                      <button
                        type="button"
                        onClick={() => onCustomRoleUpdate(index, 1)}
                        disabled={isBusy}
                        className="h-7 w-7 rounded-lg border border-[color:var(--line)] bg-[var(--surface)] text-[10px] font-semibold text-[color:var(--ink-muted)] hover:text-[color:var(--ink)] disabled:opacity-60"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveCustomRole(index)}
                        disabled={isBusy}
                        className="rounded-lg border border-[color:var(--line)] bg-[var(--surface)] px-2 py-1 text-[9px] uppercase tracking-[0.2em] text-red-500 hover:text-red-700 disabled:opacity-60 sm:tracking-[0.3em]"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={onStartGame}
            disabled={isBusy || players.length < 2}
            className="w-full rounded-2xl bg-[var(--ink)] py-3 text-[11px] font-semibold uppercase tracking-[0.2em] sm:tracking-[0.35em] text-[color:var(--paper)] hover:opacity-90 disabled:opacity-60 transition"
          >
            Deal roles
          </button>
          <button
            onClick={onLeaveRoom}
            className="w-full rounded-2xl border border-red-500/40 bg-red-600 py-3 text-[10px] font-semibold uppercase tracking-[0.2em] sm:tracking-[0.35em] text-white hover:bg-red-500 transition"
          >
            Leave room
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-[color:var(--line)] bg-[var(--surface)] p-4 text-center space-y-3 sm:space-y-4">
          <p className="text-xs text-[color:var(--ink-muted)] italic">
            Waiting for the host to deal roles...
          </p>
          <button
            onClick={onLeaveRoom}
            className="w-full rounded-2xl border border-red-500/40 bg-red-600 py-3 text-[10px] font-semibold uppercase tracking-[0.2em] sm:tracking-[0.35em] text-white hover:bg-red-500 transition"
          >
            Leave room
          </button>
        </div>
      )}
    </div>
  );
};
