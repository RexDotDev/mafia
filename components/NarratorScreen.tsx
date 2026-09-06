import React from 'react';
import { Player, Role, RoundAction, RoundGameResult, RoundState } from '../types';
import { getRoleIcon } from '../constants';

export interface ActionSummaryGroup {
  mafia: RoundAction[];
  lady: RoundAction | null;
  doctor: RoundAction | null;
  detective: RoundAction | null;
}

export interface InspectorPreview {
  targetName: string;
  isMafia: boolean;
}

interface NarratorScreenProps {
  roomStatus?: 'waiting' | 'started' | 'finished';
  roundState: RoundState | null;
  isCasualMode: boolean;
  alivePlayers: Player[];
  gameResult: RoundGameResult | null;
  isBusy: boolean;
  votedPlayers: Player[];
  pendingVoters: Player[];
  roundActionSummary: ActionSummaryGroup;
  roundInspectorPreview: InspectorPreview | null;
  playerNameById: Map<string, string>;
  players: Player[];
  eliminatedPlayerIds: Set<string>;
  me: Player | null;
  onStartRound: () => void;
  onResolveRound: () => void;
  onResetGame: () => void;
  onLeaveRoom: () => void;
}

export const NarratorScreen: React.FC<NarratorScreenProps> = ({
  roomStatus,
  roundState,
  isCasualMode,
  alivePlayers,
  gameResult,
  isBusy,
  votedPlayers,
  pendingVoters,
  roundActionSummary,
  roundInspectorPreview,
  playerNameById,
  players,
  eliminatedPlayerIds,
  me,
  onStartRound,
  onResolveRound,
  onResetGame,
  onLeaveRoom,
}) => {
  return (
    <div className="space-y-6 text-left">
      {/* Gamemaster Header */}
      <div className="flex items-start justify-between gap-4 border-b border-[color:var(--line)] pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25">
              <i className="fas fa-crown text-[9px]"></i>
              Narrator Control Deck
            </span>
            {roomStatus === 'finished' && (
              <span className="text-xs font-mono font-semibold text-[color:var(--ink-muted)]">
                Round {roundState?.round || 0}
              </span>
            )}
          </div>
          <h2 className="font-display text-2xl font-bold text-[color:var(--ink)] tracking-tight">
            Game Director Console
          </h2>
          <p className="text-xs text-[color:var(--ink-muted)] mt-0.5">
            You guide the narrative, observe secret actions, and control round transitions.
          </p>
        </div>
      </div>

      {/* Round Controls */}
      {roomStatus === 'finished' && (
        <div className="rounded-xl border border-[color:var(--line)] bg-[var(--surface-soft)] p-4 space-y-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[color:var(--ink)]">
              {isCasualMode ? 'Role-Only Play' : `Current Phase: ${roundState?.phase?.toUpperCase() || 'IDLE'}`}
            </span>
            <span className="text-[color:var(--ink-muted)] font-mono">
              Alive: {alivePlayers.length}/{players.filter((p) => !p.isNarrator).length}
            </span>
          </div>

          {gameResult && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
              <i className="fas fa-trophy text-sm"></i>
              <span className="font-semibold">
                Game Over: {gameResult.winner === 'city' ? 'The Town has eliminated all Mafia!' : 'The Mafia has seized control!'}
              </span>
            </div>
          )}

          {!isCasualMode && !gameResult && (roundState?.phase === 'idle' || !roundState) && (
            <button
              type="button"
              onClick={onStartRound}
              disabled={isBusy}
              className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 text-xs tracking-wide shadow-xs transition disabled:opacity-40 btn-tactile flex items-center justify-center gap-2"
            >
              <i className="fas fa-moon text-xs"></i>
              <span>Initiate Night Phase</span>
            </button>
          )}

          {!isCasualMode && !gameResult && roundState?.phase === 'night' && (
            <button
              type="button"
              onClick={onResolveRound}
              disabled={isBusy}
              className="w-full rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 text-xs tracking-wide shadow-xs transition disabled:opacity-40 btn-tactile flex items-center justify-center gap-2"
            >
              <i className="fas fa-sun text-xs"></i>
              <span>Resolve Night Actions & Wake Town</span>
            </button>
          )}

          {!isCasualMode && !gameResult && roundState?.phase === 'voting' && (
            <div className="space-y-2 bg-[var(--surface-strong)] rounded-lg p-3 border border-[color:var(--line)]">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[color:var(--ink-muted)]">Votes In:</span>
                <span className="font-mono font-bold text-[color:var(--ink)]">
                  {votedPlayers.length}/{alivePlayers.length}
                </span>
              </div>
              <div className="text-[11px] text-[color:var(--ink-faint)] leading-tight">
                {pendingVoters.length > 0 ? (
                  <span>Waiting on: {pendingVoters.map((p) => p.name).join(', ')}</span>
                ) : (
                  <span className="text-emerald-600 font-semibold">All ballots recorded. Tallying results...</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tonight's Live Intel (Night Phase) */}
      {!isCasualMode && roomStatus === 'finished' && roundState?.phase === 'night' && (
        <div className="rounded-xl border border-[color:var(--line)] bg-[var(--surface-soft)] p-4 space-y-2.5">
          <p className="text-xs font-bold uppercase tracking-wider text-[color:var(--ink-muted)]">
            Tonight's Live Intel
          </p>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--surface-strong)] border border-[color:var(--line)]">
              <span className="font-medium text-red-600 flex items-center gap-1.5">
                <i className="fas fa-user-secret text-xs"></i> Mafia Target:
              </span>
              <span className="font-mono font-bold text-[color:var(--ink)]">
                {roundActionSummary.mafia.length
                  ? roundActionSummary.mafia.map((item) => item.targetName).join(', ')
                  : 'Pending...'}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--surface-strong)] border border-[color:var(--line)]">
              <span className="font-medium text-emerald-600 flex items-center gap-1.5">
                <i className="fas fa-user-md text-xs"></i> Doctor Protect:
              </span>
              <span className="font-mono font-bold text-[color:var(--ink)]">
                {roundActionSummary.doctor?.targetName || 'Pending...'}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--surface-strong)] border border-[color:var(--line)]">
              <span className="font-medium text-amber-600 flex items-center gap-1.5">
                <i className="fas fa-search text-xs"></i> Detective Inquiry:
              </span>
              <span className="font-mono font-bold text-[color:var(--ink)]">
                {roundInspectorPreview?.targetName || roundActionSummary.detective?.targetName || 'Pending...'}
                {roundInspectorPreview && ` (${roundInspectorPreview.isMafia ? 'MAFIA' : 'CLEAN'})`}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--surface-strong)] border border-[color:var(--line)]">
              <span className="font-medium text-rose-600 flex items-center gap-1.5">
                <i className="fas fa-chess-queen text-xs"></i> Silencer Block:
              </span>
              <span className="font-mono font-bold text-[color:var(--ink)]">
                {roundActionSummary.lady?.targetName || 'Pending...'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Complete Player Roles Roster */}
      <div className="rounded-xl border border-[color:var(--line)] bg-[var(--surface-strong)] overflow-hidden shadow-xs">
        <div className="p-3.5 border-b border-[color:var(--line)] flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-[color:var(--ink)]">
            Player Roles Dossier
          </span>
          <span className="text-[11px] text-[color:var(--ink-faint)]">Narrator Eyes Only</span>
        </div>
        <div className="divide-y divide-[color:var(--line)] max-h-60 overflow-y-auto">
          {players
            .filter((p) => !p.isNarrator)
            .map((player) => {
              const isDead = eliminatedPlayerIds.has(player.id);
              const role = player.role || Role.VILLAGER;

              return (
                <div
                  key={player.id}
                  className={`flex items-center justify-between px-4 py-2.5 text-xs transition-colors ${
                    isDead ? 'opacity-40 bg-[var(--surface-soft)]' : ''
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">{getRoleIcon(role)}</span>
                    <div>
                      <span className={`font-semibold ${isDead ? 'line-through' : 'text-[color:var(--ink)]'}`}>
                        {player.name}
                      </span>
                      {isDead && <span className="ml-1.5 text-[10px] text-red-600 font-bold">(Eliminated)</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span className="font-bold text-[color:var(--ink)]">{role}</span>
                    {player.hasConfirmed ? (
                      <i className="fas fa-check text-emerald-600 text-[10px]" title="Role confirmed"></i>
                    ) : (
                      <i className="fas fa-clock text-[color:var(--ink-faint)] text-[10px]" title="Awaiting confirmation"></i>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-2 flex flex-col gap-2">
        {me?.isHost && (
          <button
            type="button"
            onClick={onResetGame}
            disabled={isBusy}
            className="w-full py-2.5 rounded-xl bg-[var(--ink)] text-[var(--paper)] text-xs font-semibold hover:opacity-90 disabled:opacity-40 transition btn-tactile"
          >
            Redistribute & Start New Game
          </button>
        )}
        <button
          type="button"
          onClick={onLeaveRoom}
          className="w-full py-2.5 rounded-xl border border-[color:var(--line)] text-xs font-medium text-[color:var(--ink-muted)] hover:text-red-600 hover:border-red-500/30 hover:bg-red-500/5 transition btn-tactile"
        >
          Exit Room
        </button>
      </div>
    </div>
  );
};
