import React from 'react';
import { GraveyardMessage, RoundGameResult } from '../types';

interface GraveyardScreenProps {
  gameResult: RoundGameResult | null;
  messages: GraveyardMessage[];
  currentUserId?: string;
  draftMessage: string;
  onDraftMessageChange: (val: string) => void;
  onSendMessage: () => void;
  isBusy: boolean;
  chatRef: React.RefObject<HTMLDivElement | null>;
  onLeaveRoom: () => void;
  themeToggleFloating?: React.ReactNode;
  themeToggleInline?: React.ReactNode;
  children?: React.ReactNode;
}

export const GraveyardScreen: React.FC<GraveyardScreenProps> = ({
  gameResult,
  messages,
  currentUserId,
  draftMessage,
  onDraftMessageChange,
  onSendMessage,
  isBusy,
  chatRef,
  onLeaveRoom,
  themeToggleFloating,
  themeToggleInline,
  children,
}) => {
  return (
    <div className="app-bg">
      {themeToggleFloating}
      <div className="app-shell flex min-h-[100dvh] items-center justify-center px-4 py-6 sm:px-6 sm:py-10">
        <div className="w-full max-w-4xl">
          <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-[color:var(--line)] bg-[var(--surface)] shadow-elevated dark:shadow-elevated-dark">
            <div className="p-6 sm:p-8 md:p-10 space-y-5">
              {/* Header */}
              <div className="flex items-start justify-between gap-4 border-b border-[color:var(--line)] pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-zinc-500/15 text-zinc-600 dark:text-zinc-300 border border-zinc-500/20">
                      <i className="fas fa-ghost text-[10px]"></i>
                      The Underworld
                    </span>
                  </div>
                  <h2 className="font-display text-2xl sm:text-3xl font-bold text-[color:var(--ink)] tracking-tight">
                    The Graveyard
                  </h2>
                  <p className="mt-1 text-xs text-[color:var(--ink-muted)]">
                    Private channel for departed souls. Living players cannot see your messages.
                  </p>
                  {gameResult && (
                    <div className="mt-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 font-semibold">
                      Game Concluded: {gameResult.winner === 'city' ? 'Town Victory!' : 'Mafia Victory!'}
                    </div>
                  )}
                </div>
                {themeToggleInline}
              </div>

              {/* Chat messages */}
              <div className="space-y-3">
                <div
                  ref={chatRef}
                  className="h-[52vh] min-h-[320px] max-h-[600px] overflow-y-auto space-y-2.5 rounded-xl border border-[color:var(--line)] bg-[var(--surface-soft)] p-3.5"
                >
                  {messages.length ? (
                    messages.map((message) => {
                      const isMine = message.senderId === currentUserId;
                      return (
                        <div
                          key={message.id}
                          className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[85%] rounded-xl px-3.5 py-2 text-xs sm:text-sm leading-relaxed ${
                              isMine
                                ? 'bg-red-600 text-white shadow-xs'
                                : 'bg-[var(--surface-strong)] text-[color:var(--ink)] border border-[color:var(--line)] shadow-xs'
                            }`}
                          >
                            {!isMine && (
                              <div className="mb-0.5 text-[10px] font-bold text-red-600 dark:text-red-400">
                                {message.senderName}
                              </div>
                            )}
                            <div className="break-words whitespace-pre-wrap">{message.message}</div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[color:var(--ink-faint)]">
                      <i className="fas fa-comment-slash text-2xl mb-2"></i>
                      <p className="text-xs">No afterlife whispers yet. Speak your truth!</p>
                    </div>
                  )}
                </div>

                {/* Input row */}
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={draftMessage}
                    onChange={(e) => onDraftMessageChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        onSendMessage();
                      }
                    }}
                    placeholder="Whisper to other eliminated players..."
                    className="flex-1 rounded-xl border border-[color:var(--line)] bg-[var(--surface-strong)] px-4 py-2.5 text-xs sm:text-sm text-[color:var(--ink)] placeholder:text-[color:var(--ink-soft)] focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 transition"
                  />
                  <button
                    type="button"
                    onClick={onSendMessage}
                    disabled={isBusy || !draftMessage.trim()}
                    className="rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2.5 text-xs sm:text-sm tracking-wide shadow-xs transition disabled:opacity-40 btn-tactile flex items-center gap-1.5"
                  >
                    <span>Send</span>
                    <i className="fas fa-paper-plane text-[10px]"></i>
                  </button>
                </div>
              </div>

              {/* Footer Leave Room */}
              <div className="flex justify-end pt-2 border-t border-[color:var(--line)]">
                <button
                  type="button"
                  onClick={onLeaveRoom}
                  className="py-2 px-4 rounded-xl border border-[color:var(--line)] text-xs font-medium text-[color:var(--ink-muted)] hover:text-red-600 hover:border-red-500/30 transition btn-tactile"
                >
                  Leave Room
                </button>
              </div>
            </div>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
};
