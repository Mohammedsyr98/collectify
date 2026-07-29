import type { HealthResponse, SessionResponse } from '@collectify/contracts';

const DEFAULT_BACKEND_URL = 'http://localhost:3000/api';

export function getBackendUrl(): string {
  return (import.meta.env.VITE_BACKEND_URL ?? DEFAULT_BACKEND_URL).replace(/\/$/, '');
}

export async function getHealth(): Promise<HealthResponse> {
  const response = await fetch(`${getBackendUrl()}/health`);

  if (!response.ok) {
    throw new Error(`Health check failed with status ${response.status}`);
  }

  return response.json() as Promise<HealthResponse>;
}

export async function getSession(): Promise<SessionResponse> {
  const response = await fetch(`${getBackendUrl()}/session`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Session probe failed with status ${response.status}`);
  }

  return response.json() as Promise<SessionResponse>;
}
