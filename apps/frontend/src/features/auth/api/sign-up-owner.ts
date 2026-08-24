import {
  ownerSignUpResponseSchema,
  type OwnerSignUpRequest,
  type OwnerSignUpResponse,
} from '@collectify/contracts';

import { fetchBackend } from '../../../shared/api/fetch-backend';

export async function signUpOwner(
  request: OwnerSignUpRequest,
): Promise<OwnerSignUpResponse> {
  return fetchBackend({
    path: '/owner/sign-up',
    method: 'POST',
    body: request,
    responseSchema: ownerSignUpResponseSchema,
    unexpectedMessage: 'Owner sign-up returned an unexpected response.',
  });
}
