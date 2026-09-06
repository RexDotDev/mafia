import React from 'react';
import { GamePhase } from '../types';
import { ThemeMode } from '../hooks/useTheme';

interface HeaderProps {
  roomCode: string;
  phase: GamePhase;
  entryMode: 'join' | 'create';
  copyStatus: 'idle' | 'copied' | 'error';
  theme: ThemeMode;
  onToggleTheme: () => void;
  onCopyCode: () => void;
  onNewCode: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  roomCode,
  phase,
  entryMode,
  copyStatus,
  theme,
  onToggleTheme,
  onCopyCode,
  onNewCode,
}) => {
  return (
    <aside className="flex flex-col gap-4 sm:gap-6 bg-[var(--surface-soft)] p-5 sm:p-6 md:p-8 border-b md:border-b-0 md:border-r border-[color:var(--line)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] sm:tracking-[0.4em] text-[color:var(--ink-faint)]">
            Social deduction game
          </p>
          <div className="flex items-center gap-3">
            <img src="/favicon.png" alt="Mafia Night Game" className="h-8 w-8 md:h-9 md:w-9 rounded-md" />
            <h1 className="title-font text-3xl sm:text-4xl md:text-5xl text-[color:var(--ink)]">
              MAFIA
            </h1>
          </div>
          <p className="mt-2 text-sm text-[color:var(--ink-muted)]">
            Private roles, live rounds, and voting.
          </p>
        </div>

        <button
          type="button"
          onClick={onToggleTheme}
          className="md:hidden h-10 w-10 rounded-full border border-[color:var(--line)] bg-[var(--surface-strong)] text-[color:var(--ink)] hover:opacity-80 transition"
          aria-label="Toggle theme"
          title={theme === 'light' ? 'Dark theme' : 'Light theme'}
        >
          <i className={`fas ${theme === 'light' ? 'fa-moon' : 'fa-sun'}`}></i>
        </button>
      </div>

      {roomCode.length === 6 && (
        <div className="rounded-2xl border border-[color:var(--line)] bg-[var(--surface-strong)] p-4">
          <p className="text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.35em] text-[color:var(--ink-faint)]">
            Room code
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-base font-semibold tracking-[0.2em] text-[color:var(--ink)] sm:text-xl sm:tracking-[0.35em]">
              {roomCode.toUpperCase()}
            </span>
            <button
              type="button"
              onClick={onCopyCode}
              className="w-full rounded-xl border border-[color:var(--line)] bg-[var(--surface-strong)] px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-[color:var(--ink-muted)] hover:text-[color:var(--ink)] transition sm:w-auto sm:tracking-[0.3em]"
            >
              {copyStatus === 'copied' ? 'Copied' : copyStatus === 'error' ? 'Copy failed' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      {phase === GamePhase.JOIN && entryMode === 'create' && (
        <button
          type="button"
          onClick={onNewCode}
          className="w-full rounded-xl border border-[color:var(--line)] bg-[var(--surface-strong)] px-3 py-2 text-[9px] uppercase tracking-[0.2em] sm:tracking-[0.3em] text-[color:var(--ink-muted)] hover:text-[color:var(--ink)] transition"
        >
          New code
        </button>
      )}

      {!(phase === GamePhase.JOIN && entryMode === 'create') && (
        <div className="rounded-2xl border border-[color:var(--line)] bg-[var(--surface)] p-4 text-xs text-[color:var(--ink-muted)]">
          <div className="flex items-center gap-2 text-[color:var(--ink-muted)]">
            <span className="h-2 w-2 rounded-full bg-red-500"></span>
            <span>Private role sharing</span>
          </div>
          <p className="mt-2 leading-relaxed">
            Use phones for private roles, or run the complete game in the app.
          </p>
        </div>
      )}
    </aside>
  );
};
