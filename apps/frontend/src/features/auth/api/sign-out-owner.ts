import {
  ownerSignOutResponseSchema,
  type OwnerSignOutResponse,
} from '@collectify/contracts';

import {
  createApiError,
  createApiErrorFromResponseBody,
  getBackendUrl,
  readJsonResponse,
} from '../../../shared/api/http';

export async function signOutOwner(): Promise<OwnerSignOutResponse> {
  const response = await fetch(`${getBackendUrl()}/owner/sign-out`, {
    method: 'POST',
    credentials: 'include',
  });

  const responseBody = await readJsonResponse(response);

  if (!response.ok) {
    throw createApiErrorFromResponseBody(responseBody, {
      status: response.status,
    });
  }

  const signOutResult = ownerSignOutResponseSchema.safeParse(responseBody);

  if (!signOutResult.success) {
    throw createApiError('Owner sign-out returned an unexpected response.', {
      status: response.status,
    });
  }

  return signOutResult.data;
}
