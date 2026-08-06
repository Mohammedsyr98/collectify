import {
  ownerSignInErrorResponseSchema,
  ownerSignInResponseSchema,
  type OwnerSignInRequest,
  type OwnerSignInResponse,
} from '@collectify/contracts';

import {
  createApiError,
  getBackendUrl,
  readJsonResponse,
} from '../../../shared/api/http';

export async function signInOwner(
  request: OwnerSignInRequest,
): Promise<OwnerSignInResponse> {
  const response = await fetch(`${getBackendUrl()}/owner/sign-in`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  const responseBody = await readJsonResponse(response);

  if (!response.ok) {
    const errorResult = ownerSignInErrorResponseSchema.safeParse(responseBody);

    if (errorResult.success) {
      throw createApiError(errorResult.data.message, {
        status: response.status,
        code: errorResult.data.code,
        fieldErrors: errorResult.data.fieldErrors,
      });
    }

    throw createApiError(`Owner sign-in failed with status ${response.status}`, {
      status: response.status,
    });
  }

  const signInResult = ownerSignInResponseSchema.safeParse(responseBody);

  if (!signInResult.success) {
    throw createApiError('Owner sign-in returned an unexpected response.', {
      status: response.status,
    });
  }

  return signInResult.data;
}
