import type { HealthResponse } from '@collectify/contracts';

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
