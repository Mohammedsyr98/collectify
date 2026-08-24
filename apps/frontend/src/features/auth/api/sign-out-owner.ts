import {
  ownerSignOutResponseSchema,
  type OwnerSignOutResponse,
} from '@collectify/contracts';

import { fetchBackend } from '../../../shared/api/fetch-backend';

export async function signOutOwner(): Promise<OwnerSignOutResponse> {
  return fetchBackend({
    path: '/owner/sign-out',
    method: 'POST',
    responseSchema: ownerSignOutResponseSchema,
    unexpectedMessage: 'Owner sign-out returned an unexpected response.',
  });
}
