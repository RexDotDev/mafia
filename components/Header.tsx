import React, { useState } from 'react';
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
  const [justCopied, setJustCopied] = useState(false);

  const handleCopyClick = () => {
    onCopyCode();
    setJustCopied(true);
    setTimeout(() => setJustCopied(false), 2000);
  };

  const isCopied = copyStatus === 'copied' || justCopied;

  return (
    <aside className="flex flex-col justify-between gap-6 bg-[var(--surface-soft)] p-6 sm:p-7 md:p-8 border-b md:border-b-0 md:border-r border-[color:var(--line)]">
      <div className="space-y-6">
        {/* Brand identity */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse"></span>
                Confidential
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <img
                src="/favicon.png"
                alt="Mafia"
                className="h-8 w-8 rounded-lg border border-[color:var(--line)] shadow-xs"
              />
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-[color:var(--ink)]">
                MAFIA<span className="text-red-600">.</span>
              </h1>
            </div>
            <p className="mt-1.5 text-xs text-[color:var(--ink-muted)] leading-relaxed">
              Real-time social deduction, deception, and secret identities.
            </p>
          </div>

          <button
            type="button"
            onClick={onToggleTheme}
            className="md:hidden h-9 w-9 inline-flex items-center justify-center rounded-xl border border-[color:var(--line)] bg-[var(--surface-strong)] text-[color:var(--ink-muted)] hover:text-[color:var(--ink)] hover:bg-[var(--surface)] transition btn-tactile"
            aria-label="Toggle theme"
            title={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
          >
            <i className={`fas ${theme === 'light' ? 'fa-moon text-xs' : 'fa-sun text-xs text-amber-500'}`}></i>
          </button>
        </div>

        {/* Room access terminal code */}
        {roomCode.length === 6 && (
          <div className="rounded-xl border border-[color:var(--line)] bg-[var(--surface-strong)] p-4 shadow-xs">
            <div className="flex items-center justify-between text-[11px] font-medium text-[color:var(--ink-muted)] mb-2">
              <span className="flex items-center gap-1.5">
                <i className="fas fa-key text-[10px] text-[color:var(--ink-faint)]"></i>
                ROOM CODE
              </span>
              <span className="text-[10px] uppercase font-mono text-[color:var(--ink-faint)]">
                6-digit pin
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 bg-[var(--surface-soft)] rounded-lg p-2.5 border border-[color:var(--line)]">
              <span className="font-mono text-xl sm:text-2xl font-bold tracking-[0.25em] text-[color:var(--ink)] pl-1 select-all">
                {roomCode.toUpperCase()}
              </span>
              <button
                type="button"
                onClick={handleCopyClick}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold tracking-wide transition btn-tactile ${
                  isCopied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[var(--surface-strong)] text-[color:var(--ink)] hover:bg-[var(--surface)] border border-[color:var(--line)]'
                }`}
              >
                <i className={`fas ${isCopied ? 'fa-check' : 'fa-copy'} text-[11px]`}></i>
                <span>{isCopied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            {phase === GamePhase.JOIN && entryMode === 'create' && (
              <button
                type="button"
                onClick={onNewCode}
                className="mt-2.5 w-full inline-flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium text-[color:var(--ink-muted)] hover:text-[color:var(--ink)] hover:bg-[var(--surface-soft)] transition"
              >
                <i className="fas fa-rotate text-[10px]"></i>
                <span>Generate different code</span>
              </button>
            )}
          </div>
        )}

        {/* Tactical Guidance note */}
        {!(phase === GamePhase.JOIN && entryMode === 'create') && (
          <div className="rounded-xl border border-[color:var(--line)] bg-[var(--surface)] p-3.5 text-xs text-[color:var(--ink-muted)] space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-[color:var(--ink)]">
              <i className="fas fa-shield-halved text-xs text-red-500"></i>
              <span>Confidential Play</span>
            </div>
            <p className="leading-relaxed text-[11px] text-[color:var(--ink-muted)]">
              Keep your screen concealed. Night actions and role reveals are strictly private to each player.
            </p>
          </div>
        )}
      </div>

      {/* Sidebar footer / status */}
      <div className="pt-4 border-t border-[color:var(--line)] flex items-center justify-between text-[11px] text-[color:var(--ink-faint)]">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
          Direct connection
        </span>
        <span className="font-mono text-[10px]">v1.0</span>
      </div>
    </aside>
  );
};
