import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-5 sm:mt-8 flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.4em] text-[color:var(--ink-soft)]">
      <i className="fas fa-fingerprint"></i>
      <span>Free, open-source Mafia party game</span>
    </footer>
  );
};
