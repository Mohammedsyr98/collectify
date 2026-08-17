import type { OwnerProfile } from '@collectify/contracts';

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

export interface AuthenticatedOwnerProfile extends OwnerProfile {
  id: string;
  userId: string;
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
