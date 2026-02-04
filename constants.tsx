
import React from 'react';
import { Role } from './types';

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  [Role.MAFIA]: 'Vaš cilj je da eliminišete sve građane bez da budete otkriveni. Svake noći birate jednu žrtvu.',
  [Role.VILLAGER]: 'Vaš cilj je da otkrijete i glasanjem eliminišete sve članove mafije pre nego što oni preuzmu grad.',
  [Role.DOCTOR]: 'Svake noći birate jednu osobu (ili sebe) koju želite da zaštitite od napada mafije.',
  [Role.DETECTIVE]: 'Svake noći birate jednog igrača čiji identitet želite da proverite.'
};

export const ROLE_ICONS: Record<Role, React.ReactNode> = {
  [Role.MAFIA]: <i className="fas fa-user-secret text-red-600"></i>,
  [Role.VILLAGER]: <i className="fas fa-users text-blue-400"></i>,
  [Role.DOCTOR]: <i className="fas fa-user-md text-green-400"></i>,
  [Role.DETECTIVE]: <i className="fas fa-search text-yellow-400"></i>
};
