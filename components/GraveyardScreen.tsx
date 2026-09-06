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
      <div className="app-shell flex min-h-screen items-center justify-center px-4 py-6 sm:px-6 sm:py-10">
        <div className="w-full max-w-6xl">
          <div className="relative">
            <div className="absolute -inset-1 rounded-[36px] bg-gradient-to-br from-red-500/45 via-red-400/20 to-transparent blur-2xl"></div>
            <div className="relative overflow-hidden rounded-[32px] border border-[color:var(--line)] bg-[var(--surface)]">
              <div className="p-5 sm:p-8 md:p-10">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="title-font text-3xl sm:text-4xl text-[color:var(--ink)]">Graveyard</h2>
                    <p className="mt-2 text-sm text-[color:var(--ink-muted)]">
                      Private chat for eliminated players.
                    </p>
                    {gameResult && (
                      <p className="mt-2 text-sm text-[color:var(--ink-muted)]">
                        Game over: {gameResult.winner === 'city' ? 'The town wins.' : 'The Mafia wins.'}
                      </p>
                    )}
                  </div>
                  {themeToggleInline}
                </div>

                <div className="mt-5 rounded-2xl border border-[color:var(--line)] bg-[var(--surface)] p-4 text-left space-y-3">
                  <div
                    ref={chatRef}
                    className="h-[62vh] min-h-[360px] max-h-[720px] overflow-y-auto space-y-2 rounded-xl border border-[color:var(--line)] bg-[var(--surface-strong)] p-3"
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
                              className={`max-w-[86%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                                isMine
                                  ? 'rounded-br-md bg-red-600 text-white'
                                  : 'rounded-bl-md border border-[color:var(--line)] bg-[var(--surface)] text-[color:var(--ink)]'
                              }`}
                            >
                              {!isMine && (
                                <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--ink-faint)]">
                                  {message.senderName}
                                </div>
                              )}
                              <div className="break-words whitespace-pre-wrap">{message.message}</div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-xs text-[color:var(--ink-soft)]">No messages yet.</p>
                    )}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-[1fr,auto] sm:items-end">
                    <textarea
                      value={draftMessage}
                      onChange={(event) => onDraftMessageChange(event.target.value)}
                      placeholder="Message the graveyard..."
                      className="min-h-[86px] w-full resize-y rounded-xl border border-[color:var(--line)] bg-[var(--surface-strong)] px-3 py-2 text-sm text-[color:var(--ink)] placeholder:text-[color:var(--ink-soft)] focus:outline-none focus:ring-2 focus:ring-red-400/50"
                    />
                    <button
                      onClick={onSendMessage}
                      disabled={isBusy || !draftMessage.trim()}
                      className="w-full rounded-xl bg-[var(--ink)] px-5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--paper)] hover:opacity-90 disabled:opacity-60 sm:w-auto sm:min-h-[86px]"
                    >
                      Send
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    onClick={onLeaveRoom}
                    className="rounded-2xl border border-red-500/40 bg-red-600 px-5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.2em] sm:tracking-[0.35em] text-white hover:bg-red-500 transition"
                  >
                    Leave room
                  </button>
                </div>
              </div>
            </div>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
};
