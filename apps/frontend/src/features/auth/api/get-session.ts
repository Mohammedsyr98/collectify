import {
  sessionResponseSchema,
  type SessionResponse,
} from '@collectify/contracts';

import {
  createApiError,
  getBackendUrl,
  readJsonResponse,
} from '../../../shared/api/http';

export async function getSession(): Promise<SessionResponse> {
  const response = await fetch(`${getBackendUrl()}/session`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Session probe failed with status ${response.status}`);
  }

  const responseBody = await readJsonResponse(response);
  const sessionResult = sessionResponseSchema.safeParse(responseBody);

  if (!sessionResult.success) {
    throw createApiError('Session probe returned an unexpected response.', {
      status: response.status,
    });
  }

  return sessionResult.data;
}
