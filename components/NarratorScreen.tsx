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
    <div className="text-center space-y-5 sm:space-y-6 py-2">
      <div>
        <h2 className="title-font text-3xl text-[color:var(--ink)]">Narrator</h2>
        <p className="mt-2 text-sm text-[color:var(--ink-muted)]">
          You guide the game, see every role, and manage rounds without voting.
        </p>
        {roomStatus === 'finished' && (
          <p className="mt-2 text-xs uppercase tracking-[0.3em] text-emerald-600">
            {isCasualMode ? 'Role-only mode is active' : `Everyone has seen their role. Round ${roundState?.round || 0}`}
          </p>
        )}
      </div>

      {roomStatus === 'finished' && (
        <div className="rounded-2xl border border-[color:var(--line)] bg-[var(--surface)] p-4 space-y-3 text-left">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
              {isCasualMode ? 'Role-only mode' : 'Round controls'}
            </p>
            <span className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--ink-soft)]">
              {isCasualMode ? 'Continue the game in person' : `Phase: ${roundState?.phase || 'idle'}`}
            </span>
          </div>

          <div className="text-xs text-[color:var(--ink-muted)]">
            Active players: {alivePlayers.length}
          </div>
          <div className="text-xs text-[color:var(--ink-muted)]">
            Alive: {alivePlayers.length ? alivePlayers.map((player) => player.name).join(', ') : 'none'}
          </div>
          {gameResult && (
            <div className="rounded-xl border border-[color:var(--line)] bg-[var(--surface-strong)] px-3 py-2 text-xs text-[color:var(--ink-muted)]">
              Game over: {gameResult.winner === 'city' ? 'The town wins.' : 'The Mafia wins.'}
            </div>
          )}
          {isCasualMode && (
            <p className="text-xs text-[color:var(--ink-muted)]">
              This mode only assigns and reveals roles. Night actions, discussion, and voting happen in person.
            </p>
          )}

          {!isCasualMode && !gameResult && (roundState?.phase === 'idle' || !roundState) && (
            <button
              onClick={onStartRound}
              disabled={isBusy}
              className="w-full rounded-xl bg-[var(--ink)] py-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--paper)] hover:opacity-90 disabled:opacity-60"
            >
              Start night round
            </button>
          )}

          {!isCasualMode && !gameResult && roundState?.phase === 'night' && (
            <button
              onClick={onResolveRound}
              disabled={isBusy}
              className="w-full rounded-xl bg-[var(--ink)] py-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--paper)] hover:opacity-90 disabled:opacity-60"
            >
              Resolve night
            </button>
          )}

          {!isCasualMode && !gameResult && roundState?.phase === 'voting' && (
            <div className="space-y-2">
              <div className="text-xs text-[color:var(--ink-muted)]">
                Votes submitted: {votedPlayers.length}/{alivePlayers.length}
              </div>
              <div className="text-xs text-[color:var(--ink-muted)]">
                Voted: {votedPlayers.length ? votedPlayers.map((player) => player.name).join(', ') : 'nobody'}
              </div>
              <div className="text-xs text-[color:var(--ink-muted)]">
                Waiting for: {pendingVoters.length ? pendingVoters.map((player) => player.name).join(', ') : 'all votes are in'}
              </div>
              <p className="text-[11px] text-[color:var(--ink-soft)]">
                The result appears automatically after every living player submits a vote.
              </p>
            </div>
          )}
        </div>
      )}

      {!isCasualMode && roomStatus === 'finished' && roundState?.phase === 'night' && (
        <div className="rounded-2xl border border-[color:var(--line)] bg-[var(--surface)] p-4 space-y-2 text-left">
          <p className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">Tonight's actions</p>
          <div className="text-xs text-[color:var(--ink-muted)]">
            Mafia targets:{' '}
            {roundActionSummary.mafia.length
              ? roundActionSummary.mafia.map((item) => item.targetName).join(', ')
              : 'no selection'}
          </div>
          <div className="text-xs text-[color:var(--ink-muted)]">
            Silencer blocks: {roundActionSummary.lady?.targetName || 'no selection'}
          </div>
          <div className="text-xs text-[color:var(--ink-muted)]">
            Doctor protects: {roundActionSummary.doctor?.targetName || 'no selection'}
          </div>
          <div className="text-xs text-[color:var(--ink-muted)]">
            Detective investigates: {roundInspectorPreview?.targetName || roundActionSummary.detective?.targetName || 'no selection'}
            {roundInspectorPreview && ` (${roundInspectorPreview.isMafia ? 'Mafia' : 'not Mafia'})`}
          </div>
        </div>
      )}

      {!isCasualMode && roomStatus === 'finished' && roundState?.lastResult && (
        <div className="rounded-2xl border border-[color:var(--line)] bg-[var(--surface)] p-4 space-y-2 text-left">
          <p className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">Previous night</p>
          <div className="text-xs text-[color:var(--ink-muted)]">
            Mafia eliminated: {roundState.lastResult.killedPlayerId ? playerNameById.get(roundState.lastResult.killedPlayerId) : 'nobody'}
          </div>
          <div className="text-xs text-[color:var(--ink-muted)]">
            Detective investigated: {roundState.lastResult.inspectorTargetId ? playerNameById.get(roundState.lastResult.inspectorTargetId) : 'nobody'}
            {roundState.lastResult.inspectorTargetId &&
              ` - ${roundState.lastResult.inspectorIsMafia ? 'Mafia' : 'not Mafia'}`}
          </div>
          <div className="text-xs text-[color:var(--ink-muted)]">
            Doctor protected: {roundState.lastResult.doctorTargetId ? playerNameById.get(roundState.lastResult.doctorTargetId) : 'nobody'}
            {roundState.lastResult.doctorSaved ? ' (successful save)' : ''}
          </div>
          <div className="text-xs text-[color:var(--ink-muted)]">
            Silencer blocked: {roundState.lastResult.ladyTargetId ? playerNameById.get(roundState.lastResult.ladyTargetId) : 'nobody'}
          </div>
        </div>
      )}

      {!isCasualMode && roomStatus === 'finished' && roundState?.events?.length ? (
        <div className="rounded-2xl border border-[color:var(--line)] bg-[var(--surface)] p-4 space-y-2 text-left">
          <p className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">Round history</p>
          <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
            {[...roundState.events].slice(-14).reverse().map((event) => (
              <div
                key={event.id}
                className="rounded-lg border border-[color:var(--line)] bg-[var(--surface-strong)] px-2.5 py-2 text-xs text-[color:var(--ink-muted)]"
              >
                <span className="text-[10px] uppercase tracking-[0.14em] text-[color:var(--ink-soft)]">
                  Round {event.round}
                </span>
                <div className="mt-1">{event.message}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-[color:var(--line)] bg-[var(--surface)] p-4 space-y-3">
        <p className="text-[10px] uppercase tracking-[0.22em] sm:tracking-[0.35em] text-[color:var(--ink-faint)]">Player roles</p>
        {players
          .filter((player) => !player.isNarrator)
          .map((player) => {
            const role = player.role || Role.VILLAGER;
            const nameTone =
              role === Role.MAFIA
                ? 'text-red-600'
                : role === Role.DOCTOR
                  ? 'text-emerald-600'
                  : role === Role.DETECTIVE
                    ? 'text-amber-600'
                    : role === Role.LADY
                      ? 'text-red-500'
                      : 'text-[color:var(--ink)]';

            return (
              <div
                key={player.id}
                className="flex min-w-0 flex-col items-start gap-2 rounded-xl border border-[color:var(--line)] bg-[var(--surface-strong)] px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className={`w-full min-w-0 break-words text-left text-sm font-bold ${nameTone}`}>
                  {player.name} {eliminatedPlayerIds.has(player.id) ? '(eliminated)' : ''}
                </span>
                <span className="flex w-full items-center gap-2 text-[10px] uppercase tracking-[0.2em] sm:w-auto sm:tracking-[0.3em]">
                  <span className="text-base leading-none text-[color:var(--ink)]">
                    {getRoleIcon(player.role || Role.VILLAGER)}
                  </span>
                  <span className="break-words">{player.role || 'Role'}</span>
                </span>
              </div>
            );
          })}
      </div>

      <div className="rounded-2xl border border-[color:var(--line)] bg-[var(--surface)] p-4 space-y-2">
        <p className="text-[10px] uppercase tracking-[0.22em] sm:tracking-[0.35em] text-[color:var(--ink-faint)]">Role confirmations</p>
        {players
          .filter((player) => !player.isNarrator)
          .map((player) => (
            <div
              key={player.id}
              className="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.16em] sm:tracking-[0.35em]"
            >
              <span className={`min-w-0 flex-1 break-words text-left font-semibold ${player.hasConfirmed ? 'text-emerald-600' : 'text-[color:var(--ink-soft)]'}`}>
                {player.name}
              </span>
              {player.hasConfirmed ? (
                <i className="fas fa-check text-[10px]"></i>
              ) : (
                <i className="fas fa-clock text-[10px] text-[color:var(--ink-soft)]"></i>
              )}
            </div>
          ))}
      </div>

      {me?.isHost && (
        <button
          onClick={onResetGame}
          disabled={isBusy}
          className="w-full rounded-2xl bg-[var(--ink)] py-3 text-[11px] font-semibold uppercase tracking-[0.2em] sm:tracking-[0.35em] text-[color:var(--paper)] hover:opacity-90 disabled:opacity-60"
        >
          Assign new roles
        </button>
      )}
      <button
        onClick={onLeaveRoom}
        className="w-full rounded-2xl border border-red-500/40 bg-red-600 py-3 text-[10px] font-semibold uppercase tracking-[0.2em] sm:tracking-[0.35em] text-white hover:bg-red-500 transition"
      >
        Leave room
      </button>
    </div>
  );
};
