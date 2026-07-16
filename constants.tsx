import React from 'react';
import { Role } from './types';

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  [Role.MAFIA]: 'Eliminate the townspeople without being discovered. Choose one target with your team each night.',
  [Role.VILLAGER]: 'Identify and vote out every Mafia member before they take control of the town.',
  [Role.DOCTOR]: 'Choose one player, including yourself, to protect from the Mafia each night.',
  [Role.DETECTIVE]: 'Investigate one player each night to learn whether they belong to the Mafia.',
  [Role.LADY]: 'Silence one player each night and block their night action for that round.',
  [Role.NARRATOR]: 'Guide the game, see every role, and manage rounds without taking part in votes.'
};

export const ROLE_ICONS: Record<Role, React.ReactNode> = {
  [Role.MAFIA]: <i className="fas fa-user-secret text-red-600"></i>,
  [Role.VILLAGER]: <i className="fas fa-users text-blue-400"></i>,
  [Role.DOCTOR]: <i className="fas fa-user-md text-green-400"></i>,
  [Role.DETECTIVE]: <i className="fas fa-search text-yellow-400"></i>,
  [Role.LADY]: <i className="fas fa-chess-queen text-red-500"></i>,
  [Role.NARRATOR]: <i className="fas fa-microphone text-amber-500"></i>
};

export const DEFAULT_ROLE_ICON = <i className="fas fa-user-tag text-slate-500"></i>;
export const DEFAULT_ROLE_DESCRIPTION = 'A custom role chosen by the host.';

export const getRoleIcon = (role?: string) => ROLE_ICONS[role as Role] ?? DEFAULT_ROLE_ICON;
export const getRoleDescription = (role?: string) => ROLE_DESCRIPTIONS[role as Role] ?? DEFAULT_ROLE_DESCRIPTION;
