import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-6 sm:mt-8 flex items-center justify-between px-2 text-[11px] text-[color:var(--ink-faint)]">
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-red-600/70"></span>
        <span className="font-medium tracking-wide">Mafia Social Deduction</span>
      </div>
      <div className="flex items-center gap-3">
        <a
          href="https://github.com/RexDotDev/mafia"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-[color:var(--ink)] transition flex items-center gap-1"
        >
          <i className="fab fa-github text-xs"></i>
          <span>Open Source</span>
        </a>
      </div>
    </footer>
  );
};
