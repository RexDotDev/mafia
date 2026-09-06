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
    <div className="fixed inset-0 z-[85] flex items-center justify-center bg-black/60 px-4 py-6">
      <div className="w-full max-w-3xl rounded-3xl border border-[color:var(--line)] bg-[var(--surface)] p-5 shadow-2xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
              Mafia chat
            </p>
            <h3 className="title-font text-2xl text-[color:var(--ink)]">
              Choose a target together
            </h3>
          </div>
          <span className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--ink-soft)]">
            Round {round}
          </span>
        </div>

        <div
          ref={chatRef}
          className="mt-4 h-[44vh] min-h-[260px] overflow-y-auto space-y-2 rounded-xl border border-[color:var(--line)] bg-[var(--surface-strong)] p-3"
        >
          {messages.length ? (
            messages.map((message) => {
              const isMine = message.senderId === currentUserId;
              return (
                <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
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
            <p className="text-xs text-[color:var(--ink-soft)] text-center py-8">
              No messages in Mafia chat yet.
            </p>
          )}
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr,auto] sm:items-end">
          <textarea
            value={draftMessage}
            onChange={(e) => onDraftChange(e.target.value)}
            placeholder="Message for your team..."
            className="min-h-[82px] w-full resize-y rounded-xl border border-[color:var(--line)] bg-[var(--surface-strong)] px-3 py-2 text-sm text-[color:var(--ink)] placeholder:text-[color:var(--ink-soft)] focus:outline-none focus:ring-2 focus:ring-red-400/50"
          />
          <button
            onClick={onSendMessage}
            disabled={isBusy || !draftMessage.trim()}
            className="w-full rounded-xl bg-[var(--ink)] px-5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--paper)] hover:opacity-90 disabled:opacity-60 sm:w-auto sm:min-h-[82px] transition"
          >
            Send
          </button>
        </div>

        <div className="mt-4 rounded-2xl border border-[color:var(--line)] bg-[var(--surface-strong)] p-3 space-y-2">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-faint)]">
            Choose target
          </p>
          <select
            value={nightTargetId}
            onChange={(e) => onTargetChange(e.target.value)}
            className="w-full rounded-xl border border-[color:var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[color:var(--ink)] focus:outline-none focus:ring-2 focus:ring-red-400/50"
          >
            <option value="">Select a player</option>
            {availableTargets.map((player) => (
              <option key={player.id} value={player.id}>
                {player.name}
              </option>
            ))}
          </select>
          <button
            onClick={onSubmitTarget}
            disabled={isBusy || !nightTargetId}
            className="w-full rounded-xl bg-[var(--ink)] py-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--paper)] hover:opacity-90 disabled:opacity-60 transition"
          >
            Confirm target
          </button>
          {lastSubmittedTargetName && (
            <p className="text-xs text-[color:var(--ink-muted)]">
              Last chosen target: {lastSubmittedTargetName}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
