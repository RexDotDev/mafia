import { CustomRoleSetting } from '../types';

export const clampCustomRoleCount = (value: number): number => Math.max(1, Math.min(10, value));

export const mergeCustomRole = (
  roles: CustomRoleSetting[],
  name: string,
  count: number,
): CustomRoleSetting[] => {
  const trimmed = name.trim();
  if (!trimmed) return roles;
  const normalized = trimmed.toLowerCase();
  const existingIndex = roles.findIndex((role) => role.name.toLowerCase() === normalized);
  if (existingIndex < 0) return [...roles, { name: trimmed, count }];
  return roles.map((role, index) =>
    index === existingIndex ? { ...role, count: clampCustomRoleCount(role.count + count) } : role,
  );
};
