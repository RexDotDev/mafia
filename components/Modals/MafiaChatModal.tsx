import React, { useEffect, useRef } from 'react';
import { MafiaMessage, Player } from '../../types';

interface MafiaChatModalProps {
  isOpen: boolean;
  round: number;
  messages: MafiaMessage[];
  currentUserId?: string;
  draftMessage: string;
  nightTargetId: string;
  availableTargets: Player[];
  lastSubmittedTargetName?: string;
  isBusy: boolean;
  onDraftChange: (val: string) => void;
  onSendMessage: () => void;
  onTargetChange: (val: string) => void;
  onSubmitTarget: () => void;
}

export const MafiaChatModal: React.FC<MafiaChatModalProps> = ({
  isOpen,
  round,
  messages,
  currentUserId,
  draftMessage,
  nightTargetId,
  availableTargets,
  lastSubmittedTargetName,
  isBusy,
  onDraftChange,
  onSendMessage,
  onTargetChange,
  onSubmitTarget,
}) => {
  const chatRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen && chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [isOpen, messages.length]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center backdrop-blur-md bg-black/75 px-4 py-6 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-2xl border border-red-500/20 bg-[var(--surface)] p-5 sm:p-6 shadow-2xl space-y-4">
        {/* Underworld Header */}
        <div className="flex items-center justify-between border-b border-[color:var(--line)] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-red-500/10 text-red-600 flex items-center justify-center border border-red-500/20">
              <i className="fas fa-user-secret text-sm"></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-lg font-bold text-[color:var(--ink)] tracking-tight">
                  Mafia Syndicate Channel
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-500/15 text-red-600 font-semibold uppercase">
                  Encrypted
                </span>
              </div>
              <p className="text-[11px] text-[color:var(--ink-muted)]">
                Conspire with your fellow Mafia members to choose tonight's hit.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-semibold text-[color:var(--ink-muted)] bg-[var(--surface-soft)] px-2.5 py-1 rounded-md border border-[color:var(--line)]">
            Round {round}
          </span>
        </div>

        {/* Messages feed */}
        <div
          ref={chatRef}
          className="h-48 sm:h-56 overflow-y-auto space-y-2 rounded-xl border border-[color:var(--line)] bg-[var(--surface-soft)] p-3"
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
                    className={`max-w-[85%] rounded-xl px-3 py-1.5 text-xs leading-relaxed ${
                      isMine
                        ? 'bg-red-600 text-white'
                        : 'bg-[var(--surface-strong)] text-[color:var(--ink)] border border-[color:var(--line)]'
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
            <div className="h-full flex flex-col items-center justify-center text-center p-4 text-[color:var(--ink-faint)]">
              <i className="fas fa-comment-dots text-xl mb-1.5 text-red-500/40"></i>
              <p className="text-xs">No chatter yet. Suggest a target to your syndicate.</p>
            </div>
          )}
        </div>

        {/* Message Input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={draftMessage}
            onChange={(e) => onDraftChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSendMessage();
            }}
            placeholder="Message the syndicate..."
            className="flex-1 rounded-xl border border-[color:var(--line)] bg-[var(--surface-strong)] px-3.5 py-2 text-xs text-[color:var(--ink)] placeholder:text-[color:var(--ink-soft)] focus:outline-none focus:border-red-500/50"
          />
          <button
            type="button"
            onClick={onSendMessage}
            disabled={isBusy || !draftMessage.trim()}
            className="rounded-xl bg-[var(--ink)] text-[var(--paper)] px-3.5 py-2 text-xs font-semibold hover:opacity-90 disabled:opacity-40 transition btn-tactile"
          >
            Send
          </button>
        </div>

        {/* Target Selection in Mafia Chat */}
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
              Syndicate Target Selection
            </span>
            {lastSubmittedTargetName && (
              <span className="text-xs font-mono text-[color:var(--ink-muted)]">
                Selected: <strong className="text-red-600">{lastSubmittedTargetName}</strong>
              </span>
            )}
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <select
                value={nightTargetId}
                onChange={(e) => onTargetChange(e.target.value)}
                className="w-full rounded-lg border border-[color:var(--line)] bg-[var(--surface-strong)] px-3 py-2 text-xs text-[color:var(--ink)] focus:outline-none focus:border-red-500/50 cursor-pointer appearance-none"
              >
                <option value="">Select townsperson to assassinate...</option>
                {availableTargets.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.name}
                  </option>
                ))}
              </select>
              <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-[color:var(--ink-faint)]">
                <i className="fas fa-chevron-down text-[10px]"></i>
              </span>
            </div>
            <button
              type="button"
              onClick={onSubmitTarget}
              disabled={isBusy || !nightTargetId}
              className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold tracking-wide disabled:opacity-40 transition btn-tactile shrink-0"
            >
              Confirm Hit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
