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
    <div className={entryMode === 'create' ? 'space-y-3 sm:space-y-4' : 'space-y-4 sm:space-y-6'}>
      <div className="rounded-2xl border border-[color:var(--line)] bg-[var(--surface-muted)] p-1 flex">
        <button
          type="button"
          onClick={() => onModeChange('create')}
          className={`flex-1 py-2 rounded-xl text-[11px] uppercase tracking-[0.3em] font-semibold transition-colors ${
            entryMode === 'create'
              ? 'bg-[var(--surface-strong)] text-[color:var(--ink)] shadow-sm'
              : 'text-[color:var(--ink-faint)] hover:text-[color:var(--ink)]'
          }`}
        >
          Create room
        </button>
        <button
          type="button"
          onClick={() => onModeChange('join')}
          className={`flex-1 py-2 rounded-xl text-[11px] uppercase tracking-[0.3em] font-semibold transition-colors ${
            entryMode === 'join'
              ? 'bg-[var(--surface-strong)] text-[color:var(--ink)] shadow-sm'
              : 'text-[color:var(--ink-faint)] hover:text-[color:var(--ink)]'
          }`}
        >
          Join room
        </button>
      </div>

      <div className="space-y-2">
        <label className="text-[11px] uppercase tracking-[0.3em] text-[color:var(--ink-faint)]">
          Player name
        </label>
        <input
          className="w-full rounded-2xl border border-[color:var(--line)] bg-[var(--surface-strong)] px-4 py-3 text-sm text-[color:var(--ink)] placeholder:text-[color:var(--ink-soft)] focus:outline-none focus:ring-2 focus:ring-red-400/50"
          placeholder="Your name"
          value={playerName}
          onChange={(e) => onPlayerNameChange(e.target.value)}
        />
      </div>

      {entryMode === 'join' ? (
        <div className="space-y-2">
          <label className="text-[11px] uppercase tracking-[0.3em] text-[color:var(--ink-faint)]">
            Room code
          </label>
          <input
            className="w-full rounded-2xl border border-[color:var(--line)] bg-[var(--surface-strong)] px-4 py-3 text-sm uppercase font-mono tracking-[0.22em] sm:tracking-[0.35em] text-[color:var(--ink)] placeholder:text-[color:var(--ink-soft)] focus:outline-none focus:ring-2 focus:ring-red-400/50"
            placeholder="6 digits"
            value={roomCode}
            onChange={(e) => onRoomCodeChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
          />
        </div>
      ) : (
        <div className="rounded-2xl border border-[color:var(--line)] bg-[var(--surface-soft)] p-3 space-y-3">
          <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.3em] text-[color:var(--ink-faint)]">
            <span>Room settings</span>
            <div className="flex items-center gap-2">
              <span className="text-[color:var(--ink-soft)]">Host</span>
              <button
                type="button"
                onClick={onToggleShowDraftCustomRoles}
                className="rounded-lg border border-[color:var(--line)] bg-[var(--surface-strong)] px-2 py-1 text-[9px] tracking-[0.16em] text-[color:var(--ink-muted)] hover:text-[color:var(--ink)]"
              >
                {showDraftCustomRoles
                  ? 'Hide roles'
                  : `Roles${draftSettings.customRoles.length ? ` (${draftSettings.customRoles.length})` : ''}`}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-[color:var(--line)] bg-[var(--surface-strong)] p-2.5">
              <p className="text-[9px] uppercase tracking-[0.2em] text-[color:var(--ink-faint)]">Mafia</p>
              <div className="mt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => onDraftMafiaChange(-1)}
                  className="h-8 w-8 rounded-lg border border-[color:var(--line)] bg-[var(--surface)] text-xs font-semibold text-[color:var(--ink-muted)] hover:text-[color:var(--ink)]"
                >
                  -
                </button>
                <span className="w-7 text-center text-sm font-semibold text-[color:var(--ink)]">
                  {draftSettings.mafiaCount}
                </span>
                <button
                  type="button"
                  onClick={() => onDraftMafiaChange(1)}
                  className="h-8 w-8 rounded-lg border border-[color:var(--line)] bg-[var(--surface)] text-xs font-semibold text-[color:var(--ink-muted)] hover:text-[color:var(--ink)]"
                >
                  +
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-[color:var(--line)] bg-[var(--surface-strong)] p-2.5">
              <div className="flex items-center justify-between">
                <p className="text-[9px] uppercase tracking-[0.2em] text-[color:var(--ink-faint)]">Silencer</p>
                <button
                  type="button"
                  onClick={onToggleDraftLady}
                  aria-pressed={draftSettings.lady}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                    draftSettings.lady ? 'bg-red-600' : 'bg-[var(--surface)] border border-[color:var(--line)]'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      draftSettings.lady ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <p className="mt-2 text-[10px] text-[color:var(--ink-muted)]">Silences a player at night</p>
            </div>
          </div>

          <div className="rounded-xl border border-[color:var(--line)] bg-[var(--surface-strong)] p-2.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] uppercase tracking-[0.2em] text-[color:var(--ink-faint)]">Role-only mode</p>
                <p className="text-[10px] text-[color:var(--ink-muted)]">Assign roles only, play IRL</p>
              </div>
              <button
                type="button"
                onClick={onToggleDraftCasualMode}
                aria-pressed={draftSettings.casualMode}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                  draftSettings.casualMode ? 'bg-red-600' : 'bg-[var(--surface)] border border-[color:var(--line)]'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                    draftSettings.casualMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {showDraftCustomRoles && (
            <div className="rounded-xl border border-[color:var(--line)] bg-[var(--surface-strong)] p-2.5 space-y-2">
              <p className="text-[9px] uppercase tracking-[0.2em] text-[color:var(--ink-faint)]">Custom roles</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={draftCustomRoleName}
                  onChange={(e) => onDraftCustomRoleNameChange(e.target.value)}
                  placeholder="e.g. Hunter"
                  maxLength={24}
                  className="min-w-0 flex-1 rounded-lg border border-[color:var(--line)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[color:var(--ink)] placeholder:text-[color:var(--ink-soft)] focus:outline-none focus:ring-1 focus:ring-red-400/50"
                />
                <button
                  type="button"
                  onClick={onAddDraftCustomRole}
                  className="rounded-lg border border-[color:var(--line)] bg-[var(--surface)] px-2.5 py-2 text-[9px] uppercase tracking-[0.16em] text-[color:var(--ink-muted)] hover:text-[color:var(--ink)]"
                >
                  Add
                </button>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onDraftCustomRoleCountChange(clampCustomRoleCount(draftCustomRoleCount - 1))}
                  className="h-7 w-7 rounded-lg border border-[color:var(--line)] bg-[var(--surface)] text-[10px] font-semibold text-[color:var(--ink-muted)] hover:text-[color:var(--ink)]"
                >
                  -
                </button>
                <span className="w-6 text-center text-[10px] font-semibold text-[color:var(--ink)]">
                  {draftCustomRoleCount}
                </span>
                <button
                  type="button"
                  onClick={() => onDraftCustomRoleCountChange(clampCustomRoleCount(draftCustomRoleCount + 1))}
                  className="h-7 w-7 rounded-lg border border-[color:var(--line)] bg-[var(--surface)] text-[10px] font-semibold text-[color:var(--ink-muted)] hover:text-[color:var(--ink)]"
                >
                  +
                </button>
              </div>

              {draftSettings.customRoles.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  {draftSettings.customRoles.map((role, index) => (
                    <div
                      key={`${role.name}-${index}`}
                      className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-[color:var(--line)] bg-[var(--surface)] px-2 py-1.5"
                    >
                      <span className="min-w-0 flex-1 truncate text-xs font-semibold text-[color:var(--ink)]">
                        {role.name}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onUpdateDraftCustomRoleCount(index, -1)}
                          className="h-6 w-6 rounded-md border border-[color:var(--line)] bg-[var(--surface)] text-[10px] font-semibold text-[color:var(--ink-muted)] hover:text-[color:var(--ink)]"
                        >
                          -
                        </button>
                        <span className="w-4 text-center text-[10px] font-semibold text-[color:var(--ink)]">
                          {role.count}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateDraftCustomRoleCount(index, 1)}
                          className="h-6 w-6 rounded-md border border-[color:var(--line)] bg-[var(--surface)] text-[10px] font-semibold text-[color:var(--ink-muted)] hover:text-[color:var(--ink)]"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemoveDraftCustomRole(index)}
                          className="rounded-md border border-[color:var(--line)] bg-[var(--surface)] px-1.5 py-1 text-[8px] uppercase tracking-[0.16em] text-red-500 hover:text-red-700"
                        >
                          X
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

      <button
        onClick={onSubmit}
        disabled={isBusy || !playerName.trim() || (entryMode === 'join' && roomCode.length !== 6)}
        className="w-full rounded-2xl bg-red-600 text-white font-semibold py-4 uppercase tracking-[0.2em] sm:tracking-[0.3em] text-xs hover:bg-red-500 disabled:opacity-50 transition"
      >
        {entryMode === 'create' ? 'Create room' : 'Join room'}
      </button>
    </div>
  );
};
