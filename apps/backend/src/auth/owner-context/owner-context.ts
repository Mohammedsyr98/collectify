import type { OwnerProfile } from '@collectify/contracts';

import type { ownerLanguageEnum } from '../../database/schema';

type PersistedOwnerLanguage = (typeof ownerLanguageEnum.enumValues)[number];

export interface OwnerContextAuthUser {
  id: string;
  email: string;
  name?: string | null;
}

export interface AuthenticatedOwnerUser {
  id: string;
  email: string;
  name: string | null;
}

export interface AuthenticatedOwnerProfile {
  id: string;
  userId: string;
  preferredLanguage: PersistedOwnerLanguage;
  defaultCurrency: OwnerProfile['defaultCurrency'];
}

export interface AuthenticatedOwner {
  user: AuthenticatedOwnerUser;
  ownerProfile: AuthenticatedOwnerProfile;
}

export interface OwnerContextRequest {
  user?: OwnerContextAuthUser | null;
  currentOwner?: AuthenticatedOwner;
}

export function toOwnerProfileResponse(
  ownerProfile: AuthenticatedOwnerProfile,
): OwnerProfile {
  return {
    preferredLanguage: ownerProfile.preferredLanguage,
    defaultCurrency: ownerProfile.defaultCurrency,
  };
}
