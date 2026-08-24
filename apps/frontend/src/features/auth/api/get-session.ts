import {
  sessionResponseSchema,
  type SessionResponse,
} from '@collectify/contracts';

import { fetchBackend } from '../../../shared/api/fetch-backend';

export async function getSession(): Promise<SessionResponse> {
  return fetchBackend({
    path: '/session',
    method: 'GET',
    responseSchema: sessionResponseSchema,
    unexpectedMessage: 'Session probe returned an unexpected response.',
  });
}
