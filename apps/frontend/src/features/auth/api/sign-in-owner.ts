import {
  ownerSignInResponseSchema,
  type OwnerSignInRequest,
  type OwnerSignInResponse,
} from '@collectify/contracts';

import { fetchBackend } from '../../../shared/api/fetch-backend';

export async function signInOwner(
  request: OwnerSignInRequest,
): Promise<OwnerSignInResponse> {
  return fetchBackend({
    path: '/owner/sign-in',
    method: 'POST',
    body: request,
    responseSchema: ownerSignInResponseSchema,
    unexpectedMessage: 'Owner sign-in returned an unexpected response.',
  });
}
