import {
  ownerSignUpResponseSchema,
  type OwnerSignUpRequest,
  type OwnerSignUpResponse,
} from '@collectify/contracts';

import {
  createApiError,
  createApiErrorFromResponseBody,
  getBackendUrl,
  readJsonResponse,
} from '../../../shared/api/http';

export async function signUpOwner(
  request: OwnerSignUpRequest,
): Promise<OwnerSignUpResponse> {
  const response = await fetch(`${getBackendUrl()}/owner/sign-up`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  const responseBody = await readJsonResponse(response);

  if (!response.ok) {
    throw createApiErrorFromResponseBody(responseBody, {
      status: response.status,
    });
  }

  const signUpResult = ownerSignUpResponseSchema.safeParse(responseBody);

  if (!signUpResult.success) {
    throw createApiError('Owner sign-up returned an unexpected response.', {
      status: response.status,
    });
  }

  return signUpResult.data;
}
