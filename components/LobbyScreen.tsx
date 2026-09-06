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
    <div className="space-y-6">
      {/* Lobby Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <h2 className="text-xs font-bold tracking-wider uppercase text-[color:var(--ink)]">
            Players In Lobby ({players.length})
          </h2>
        </div>
        {isHost ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <i className="fas fa-crown text-[9px]"></i>
            You are Host
          </span>
        ) : (
          <span className="text-xs text-[color:var(--ink-faint)]">Waiting for host</span>
        )}
      </div>

      {/* Players Roster */}
      <div className="rounded-xl border border-[color:var(--line)] bg-[var(--surface-strong)] overflow-hidden shadow-xs">
        <div className="divide-y divide-[color:var(--line)] max-h-60 overflow-y-auto">
          {players.map((player, idx) => {
            const isMe = player.clientId === clientId;
            const initial = player.name ? player.name.charAt(0).toUpperCase() : '?';

            return (
              <div
                key={player.id}
                className={`flex items-center justify-between gap-3 px-4 py-3 transition-colors ${
                  isMe ? 'bg-red-500/[0.03]' : ''
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                      player.isHost
                        ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                        : isMe
                          ? 'bg-red-500/15 text-red-600 border border-red-500/25'
                          : 'bg-[var(--surface-soft)] text-[color:var(--ink-muted)] border border-[color:var(--line)]'
                    }`}
                  >
                    {initial}
                  </div>
                  <div className="min-w-0 truncate">
                    <span className="text-sm font-semibold text-[color:var(--ink)] truncate block">
                      {player.name}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {player.isHost && (
                    <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      Host
                    </span>
                  )}
                  {isMe && (
                    <span className="text-[10px] font-semibold text-[color:var(--ink-muted)] bg-[var(--surface-soft)] px-2 py-0.5 rounded border border-[color:var(--line)]">
                      You
                    </span>
                  )}
                  <span className="h-2 w-2 rounded-full bg-emerald-500" title="Connected"></span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Host Controls */}
      {isHost ? (
        <div className="rounded-xl border border-[color:var(--line)] bg-[var(--surface-soft)] p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-[color:var(--line)] pb-3">
            <div>
              <p className="text-xs font-semibold text-[color:var(--ink)]">Host Room Settings</p>
              <p className="text-[11px] text-[color:var(--ink-muted)]">Adjust game rules before starting</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Mafia Stepper */}
            <div className="rounded-lg border border-[color:var(--line)] bg-[var(--surface-strong)] p-3 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-[color:var(--ink)] block">Mafia Count</span>
                <span className="text-[11px] text-[color:var(--ink-muted)]">Active hitmen</span>
              </div>
              <div className="flex items-center gap-1.5 bg-[var(--surface-soft)] rounded-md border border-[color:var(--line)] p-1">
                <button
                  type="button"
                  onClick={() => onMafiaCountChange(-1)}
                  disabled={isBusy || settings.mafiaCount <= 1}
                  className="h-7 w-7 rounded flex items-center justify-center text-xs font-bold text-[color:var(--ink-muted)] hover:text-[color:var(--ink)] hover:bg-[var(--surface-strong)] disabled:opacity-40 transition"
                  aria-label="Decrease Mafia"
                >
                  -
                </button>
                <span className="w-6 text-center text-sm font-bold font-mono text-red-600">
                  {settings.mafiaCount}
                </span>
                <button
                  type="button"
                  onClick={() => onMafiaCountChange(1)}
                  disabled={isBusy || settings.mafiaCount >= 6}
                  className="h-7 w-7 rounded flex items-center justify-center text-xs font-bold text-[color:var(--ink-muted)] hover:text-[color:var(--ink)] hover:bg-[var(--surface-strong)] disabled:opacity-40 transition"
                  aria-label="Increase Mafia"
                >
                  +
                </button>
              </div>
            </div>

            {/* Silencer Toggle */}
            <div className="rounded-lg border border-[color:var(--line)] bg-[var(--surface-strong)] p-3 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-[color:var(--ink)] block">Silencer Role</span>
                <span className="text-[11px] text-[color:var(--ink-muted)]">Can block night actions</span>
              </div>
              <button
                type="button"
                onClick={onLadyToggle}
                disabled={isBusy}
                aria-pressed={settings.lady}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.lady ? 'bg-red-600' : 'bg-[var(--line-strong)]'
                } ${isBusy ? 'opacity-50' : ''}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition-transform ${
                    settings.lady ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Role-only Casual Toggle */}
          <div className="rounded-lg border border-[color:var(--line)] bg-[var(--surface-strong)] p-3 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-[color:var(--ink)] block">Role-Only Mode</span>
              <p className="text-[11px] text-[color:var(--ink-muted)] leading-tight">
                {settings.casualMode
                  ? 'Assigns secret roles only. Continue discussion and voting in person.'
                  : 'Complete in-app game with night actions and ballot voting.'}
              </p>
            </div>
            <button
              type="button"
              onClick={onCasualModeToggle}
              disabled={isBusy}
              aria-pressed={settings.casualMode}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                settings.casualMode ? 'bg-red-600' : 'bg-[var(--line-strong)]'
              } ${isBusy ? 'opacity-50' : ''}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition-transform ${
                  settings.casualMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Custom Roles section */}
          <div className="rounded-lg border border-[color:var(--line)] bg-[var(--surface-strong)] p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[color:var(--ink)]">Custom Roles</span>
              <span className="text-[11px] text-[color:var(--ink-faint)]">Optional special assignments</span>
            </div>

            <div className="grid grid-cols-[1fr,auto,auto] gap-2">
              <input
                className="rounded-lg border border-[color:var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-xs text-[color:var(--ink)] placeholder:text-[color:var(--ink-soft)] focus:outline-none focus:border-red-500/50"
                placeholder="Role name..."
                value={customRoleName}
                onChange={(e) => onCustomRoleNameChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onAddCustomRole();
                }}
              />
              <div className="flex items-center gap-1 bg-[var(--surface-soft)] rounded-lg border border-[color:var(--line)] px-1">
                <button
                  type="button"
                  onClick={() => onCustomRoleCountChange(clampCustomRoleCount(customRoleCount - 1))}
                  disabled={isBusy}
                  className="h-6 w-6 text-xs text-[color:var(--ink-muted)] hover:text-[color:var(--ink)]"
                >
                  -
                </button>
                <span className="w-5 text-center text-xs font-bold font-mono">{customRoleCount}</span>
                <button
                  type="button"
                  onClick={() => onCustomRoleCountChange(clampCustomRoleCount(customRoleCount + 1))}
                  disabled={isBusy}
                  className="h-6 w-6 text-xs text-[color:var(--ink-muted)] hover:text-[color:var(--ink)]"
                >
                  +
                </button>
              </div>
              <button
                type="button"
                onClick={onAddCustomRole}
                disabled={isBusy || !customRoleName.trim()}
                className="px-3 py-2 rounded-lg bg-[var(--ink)] text-[var(--paper)] text-xs font-semibold hover:opacity-90 disabled:opacity-40 transition btn-tactile"
              >
                Add
              </button>
            </div>

            {settings.customRoles.length > 0 && (
              <div className="pt-2 border-t border-[color:var(--line)] space-y-1.5">
                {settings.customRoles.map((role, idx) => (
                  <div
                    key={`${role.name}-${idx}`}
                    className="flex items-center justify-between gap-2 rounded-md bg-[var(--surface-soft)] px-2.5 py-1.5 border border-[color:var(--line)] text-xs"
                  >
                    <span className="font-medium text-[color:var(--ink)] truncate">{role.name}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => onCustomRoleUpdate(idx, -1)}
                        disabled={isBusy}
                        className="h-5 w-5 rounded flex items-center justify-center text-xs text-[color:var(--ink-muted)] hover:text-[color:var(--ink)]"
                      >
                        -
                      </button>
                      <span className="w-4 text-center font-mono font-semibold">{role.count}</span>
                      <button
                        type="button"
                        onClick={() => onCustomRoleUpdate(idx, 1)}
                        disabled={isBusy}
                        className="h-5 w-5 rounded flex items-center justify-center text-xs text-[color:var(--ink-muted)] hover:text-[color:var(--ink)]"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveCustomRole(idx)}
                        disabled={isBusy}
                        className="ml-1 text-[color:var(--ink-faint)] hover:text-red-500 transition"
                      >
                        <i className="fas fa-xmark text-xs"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Start Action */}
          <button
            type="button"
            onClick={onStartGame}
            disabled={isBusy || players.length < 3}
            className="w-full rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold py-3.5 px-6 text-sm tracking-wide shadow-sm hover:shadow transition disabled:opacity-40 disabled:cursor-not-allowed btn-tactile flex items-center justify-center gap-2"
          >
            <i className="fas fa-play text-xs"></i>
            <span>
              {players.length < 3
                ? `Need ${3 - players.length} more player${3 - players.length > 1 ? 's' : ''} to start`
                : 'Assign Secret Roles & Begin'}
            </span>
          </button>
        </div>
      ) : (
        /* Non-Host Waiting Card */
        <div className="rounded-xl border border-[color:var(--line)] bg-[var(--surface-soft)] p-6 text-center space-y-2">
          <div className="h-9 w-9 mx-auto rounded-full bg-red-500/10 text-red-600 flex items-center justify-center">
            <i className="fas fa-hourglass-half text-sm"></i>
          </div>
          <p className="text-sm font-semibold text-[color:var(--ink)]">Waiting for Host</p>
          <p className="text-xs text-[color:var(--ink-muted)] max-w-sm mx-auto">
            The host is configuring roles and will start the game when all players have arrived.
          </p>
        </div>
      )}

      {/* Leave Room Button */}
      <button
        type="button"
        onClick={onLeaveRoom}
        className="w-full py-2.5 rounded-xl border border-[color:var(--line)] text-xs font-medium text-[color:var(--ink-muted)] hover:text-red-600 hover:border-red-500/30 hover:bg-red-500/5 transition btn-tactile"
      >
        Leave Room
      </button>
    </div>
  );
};
