import React from 'react';
import { RoomSettings } from '../types';
import { clampCustomRoleCount } from '../utils/gameUtils';

interface EntryScreenProps {
  entryMode: 'join' | 'create';
  playerName: string;
  roomCode: string;
  isBusy: boolean;
  draftSettings: RoomSettings;
  draftCustomRoleName: string;
  draftCustomRoleCount: number;
  showDraftCustomRoles: boolean;
  onModeChange: (mode: 'join' | 'create') => void;
  onPlayerNameChange: (val: string) => void;
  onRoomCodeChange: (val: string) => void;
  onDraftMafiaChange: (delta: number) => void;
  onToggleDraftLady: () => void;
  onToggleDraftCasualMode: () => void;
  onToggleShowDraftCustomRoles: () => void;
  onDraftCustomRoleNameChange: (val: string) => void;
  onDraftCustomRoleCountChange: (val: number) => void;
  onAddDraftCustomRole: () => void;
  onUpdateDraftCustomRoleCount: (index: number, delta: number) => void;
  onRemoveDraftCustomRole: (index: number) => void;
  onSubmit: () => void;
}

export const EntryScreen: React.FC<EntryScreenProps> = ({
  entryMode,
  playerName,
  roomCode,
  isBusy,
  draftSettings,
  draftCustomRoleName,
  draftCustomRoleCount,
  showDraftCustomRoles,
  onModeChange,
  onPlayerNameChange,
  onRoomCodeChange,
  onDraftMafiaChange,
  onToggleDraftLady,
  onToggleDraftCasualMode,
  onToggleShowDraftCustomRoles,
  onDraftCustomRoleNameChange,
  onDraftCustomRoleCountChange,
  onAddDraftCustomRole,
  onUpdateDraftCustomRoleCount,
  onRemoveDraftCustomRole,
  onSubmit,
}) => {
  return (
    <div className="space-y-6">
      {/* Segmented Mode Selector */}
      <div className="p-1 rounded-xl bg-[var(--surface-soft)] border border-[color:var(--line)] grid grid-cols-2 gap-1">
        <button
          type="button"
          onClick={() => onModeChange('create')}
          className={`py-2 px-3 rounded-lg text-xs font-semibold tracking-wide transition btn-tactile ${
            entryMode === 'create'
              ? 'bg-[var(--surface-strong)] text-[color:var(--ink)] shadow-xs border border-[color:var(--line)]'
              : 'text-[color:var(--ink-muted)] hover:text-[color:var(--ink)]'
          }`}
        >
          <i className="fas fa-plus mr-1.5 text-[10px] text-red-500"></i>
          Create New Room
        </button>
        <button
          type="button"
          onClick={() => onModeChange('join')}
          className={`py-2 px-3 rounded-lg text-xs font-semibold tracking-wide transition btn-tactile ${
            entryMode === 'join'
              ? 'bg-[var(--surface-strong)] text-[color:var(--ink)] shadow-xs border border-[color:var(--line)]'
              : 'text-[color:var(--ink-muted)] hover:text-[color:var(--ink)]'
          }`}
        >
          <i className="fas fa-door-open mr-1.5 text-[10px] text-[color:var(--ink-muted)]"></i>
          Join with Code
        </button>
      </div>

      {/* Player identity input */}
      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-[color:var(--ink-muted)]">
          Your alias in town
        </label>
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[color:var(--ink-faint)]">
            <i className="fas fa-user text-xs"></i>
          </span>
          <input
            className="w-full rounded-xl border border-[color:var(--line)] bg-[var(--surface-strong)] pl-10 pr-4 py-3 text-sm text-[color:var(--ink)] placeholder:text-[color:var(--ink-soft)] focus:outline-none focus:border-red-500/60 focus:ring-2 focus:ring-red-500/20 transition"
            placeholder="e.g. Vincent, Salvatore, Elena..."
            value={playerName}
            onChange={(e) => onPlayerNameChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSubmit();
            }}
            maxLength={24}
            autoFocus
          />
        </div>
      </div>

      {/* Room code input (Join mode) */}
      {entryMode === 'join' ? (
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-[color:var(--ink-muted)]">
            Enter 6-digit room code
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[color:var(--ink-faint)]">
              <i className="fas fa-key text-xs"></i>
            </span>
            <input
              className="w-full rounded-xl border border-[color:var(--line)] bg-[var(--surface-strong)] pl-10 pr-4 py-3 text-base uppercase font-mono tracking-[0.25em] text-[color:var(--ink)] placeholder:text-[color:var(--ink-soft)] focus:outline-none focus:border-red-500/60 focus:ring-2 focus:ring-red-500/20 transition"
              placeholder="000000"
              value={roomCode}
              onChange={(e) => onRoomCodeChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSubmit();
              }}
              inputMode="numeric"
            />
          </div>
        </div>
      ) : (
        /* Room configuration panel (Create mode) */
        <div className="rounded-xl border border-[color:var(--line)] bg-[var(--surface-soft)] p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-[color:var(--line)] pb-3">
            <div>
              <p className="text-xs font-semibold text-[color:var(--ink)]">Game Setup</p>
              <p className="text-[11px] text-[color:var(--ink-muted)]">Configure deck and special roles</p>
            </div>
            <button
              type="button"
              onClick={onToggleShowDraftCustomRoles}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-[color:var(--ink-muted)] hover:text-[color:var(--ink)] bg-[var(--surface-strong)] border border-[color:var(--line)] transition btn-tactile"
            >
              <i className="fas fa-sliders text-[10px]"></i>
              <span>{showDraftCustomRoles ? 'Hide Custom' : 'Custom Roles'}</span>
              {draftSettings.customRoles.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-500/15 text-red-600 font-bold">
                  {draftSettings.customRoles.length}
                </span>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Mafia Stepper */}
            <div className="rounded-lg border border-[color:var(--line)] bg-[var(--surface-strong)] p-3 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-[color:var(--ink)] block">Mafia Team</span>
                <span className="text-[11px] text-[color:var(--ink-muted)]">Underworld hitmen</span>
              </div>
              <div className="flex items-center gap-1.5 bg-[var(--surface-soft)] rounded-md border border-[color:var(--line)] p-1">
                <button
                  type="button"
                  onClick={() => onDraftMafiaChange(-1)}
                  disabled={draftSettings.mafiaCount <= 1}
                  className="h-7 w-7 rounded flex items-center justify-center text-xs font-bold text-[color:var(--ink-muted)] hover:text-[color:var(--ink)] hover:bg-[var(--surface-strong)] disabled:opacity-40 transition"
                  aria-label="Decrease Mafia count"
                >
                  -
                </button>
                <span className="w-6 text-center text-sm font-bold font-mono text-red-600">
                  {draftSettings.mafiaCount}
                </span>
                <button
                  type="button"
                  onClick={() => onDraftMafiaChange(1)}
                  disabled={draftSettings.mafiaCount >= 6}
                  className="h-7 w-7 rounded flex items-center justify-center text-xs font-bold text-[color:var(--ink-muted)] hover:text-[color:var(--ink)] hover:bg-[var(--surface-strong)] disabled:opacity-40 transition"
                  aria-label="Increase Mafia count"
                >
                  +
                </button>
              </div>
            </div>

            {/* Silencer Toggle */}
            <div className="rounded-lg border border-[color:var(--line)] bg-[var(--surface-strong)] p-3 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-[color:var(--ink)] block">Silencer</span>
                <span className="text-[11px] text-[color:var(--ink-muted)]">Can mute 1 player per night</span>
              </div>
              <button
                type="button"
                onClick={onToggleDraftLady}
                aria-pressed={draftSettings.lady}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  draftSettings.lady ? 'bg-red-600' : 'bg-[var(--line-strong)]'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition-transform ${
                    draftSettings.lady ? 'translate-x-6' : 'translate-x-1'
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
                {draftSettings.casualMode
                  ? 'Assigns secret roles only. Play rounds & voting in person.'
                  : 'Full in-app experience with live voting and night actions.'}
              </p>
            </div>
            <button
              type="button"
              onClick={onToggleDraftCasualMode}
              aria-pressed={draftSettings.casualMode}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                draftSettings.casualMode ? 'bg-red-600' : 'bg-[var(--line-strong)]'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition-transform ${
                  draftSettings.casualMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Custom Roles Drawer */}
          {showDraftCustomRoles && (
            <div className="rounded-lg border border-[color:var(--line)] bg-[var(--surface-strong)] p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[color:var(--ink)]">Add Custom Roles</span>
                <span className="text-[11px] text-[color:var(--ink-faint)]">e.g. Godfather, Jester, Vigilante</span>
              </div>

              <div className="grid grid-cols-[1fr,auto,auto] gap-2">
                <input
                  className="rounded-lg border border-[color:var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-xs text-[color:var(--ink)] placeholder:text-[color:var(--ink-soft)] focus:outline-none focus:border-red-500/50"
                  placeholder="Role name..."
                  value={draftCustomRoleName}
                  onChange={(e) => onDraftCustomRoleNameChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onAddDraftCustomRole();
                  }}
                />
                <div className="flex items-center gap-1 bg-[var(--surface-soft)] rounded-lg border border-[color:var(--line)] px-1">
                  <button
                    type="button"
                    onClick={() => onDraftCustomRoleCountChange(clampCustomRoleCount(draftCustomRoleCount - 1))}
                    className="h-6 w-6 text-xs text-[color:var(--ink-muted)] hover:text-[color:var(--ink)]"
                  >
                    -
                  </button>
                  <span className="w-5 text-center text-xs font-bold font-mono">{draftCustomRoleCount}</span>
                  <button
                    type="button"
                    onClick={() => onDraftCustomRoleCountChange(clampCustomRoleCount(draftCustomRoleCount + 1))}
                    className="h-6 w-6 text-xs text-[color:var(--ink-muted)] hover:text-[color:var(--ink)]"
                  >
                    +
                  </button>
                </div>
                <button
                  type="button"
                  onClick={onAddDraftCustomRole}
                  disabled={!draftCustomRoleName.trim()}
                  className="px-3 py-2 rounded-lg bg-[var(--ink)] text-[var(--paper)] text-xs font-semibold hover:opacity-90 disabled:opacity-40 transition btn-tactile"
                >
                  Add
                </button>
              </div>

              {draftSettings.customRoles.length > 0 && (
                <div className="pt-2 border-t border-[color:var(--line)] space-y-1.5">
                  {draftSettings.customRoles.map((role, idx) => (
                    <div
                      key={`${role.name}-${idx}`}
                      className="flex items-center justify-between gap-2 rounded-md bg-[var(--surface-soft)] px-2.5 py-1.5 border border-[color:var(--line)] text-xs"
                    >
                      <span className="font-medium text-[color:var(--ink)] truncate">{role.name}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => onUpdateDraftCustomRoleCount(idx, -1)}
                          className="h-5 w-5 rounded flex items-center justify-center text-xs text-[color:var(--ink-muted)] hover:text-[color:var(--ink)]"
                        >
                          -
                        </button>
                        <span className="w-4 text-center font-mono font-semibold">{role.count}</span>
                        <button
                          type="button"
                          onClick={() => onUpdateDraftCustomRoleCount(idx, 1)}
                          className="h-5 w-5 rounded flex items-center justify-center text-xs text-[color:var(--ink-muted)] hover:text-[color:var(--ink)]"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemoveDraftCustomRole(idx)}
                          className="ml-1 text-[color:var(--ink-faint)] hover:text-red-500 transition"
                          title="Remove role"
                        >
                          <i className="fas fa-xmark text-xs"></i>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Main Action CTA */}
      <button
        type="button"
        onClick={onSubmit}
        disabled={isBusy || !playerName.trim() || (entryMode === 'join' && roomCode.length !== 6)}
        className="w-full rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold py-3.5 px-6 text-sm tracking-wide shadow-sm hover:shadow transition disabled:opacity-40 disabled:cursor-not-allowed btn-tactile flex items-center justify-center gap-2"
      >
        <span>{entryMode === 'create' ? 'Create & Enter Room' : 'Join Room'}</span>
        <i className="fas fa-arrow-right text-xs"></i>
      </button>
    </div>
  );
};
