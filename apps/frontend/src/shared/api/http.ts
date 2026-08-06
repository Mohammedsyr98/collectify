const DEFAULT_BACKEND_URL = 'http://localhost:3000/api';

type ApiFieldErrors = Partial<Record<string, string[]>>;

export type ApiError = Error & {
  code?: string;
  fieldErrors?: ApiFieldErrors;
  status: number;
};

export function getBackendUrl(): string {
  return (import.meta.env.VITE_BACKEND_URL ?? DEFAULT_BACKEND_URL).replace(
    /\/$/,
    '',
  );
}

export function createApiError(
  message: string,
  options: {
    code?: string;
    fieldErrors?: ApiFieldErrors;
    status: number;
  },
): ApiError {
  return Object.assign(new Error(message), {
    name: 'ApiError',
    code: options.code,
    fieldErrors: options.fieldErrors,
    status: options.status,
  });
}

export function isApiError(error: unknown): error is ApiError {
  return (
    error instanceof Error &&
    'status' in error &&
    typeof error.status === 'number'
  );
}

export function getApiErrorDescription(
  error: unknown,
  fallbackDescription: string,
): string {
  if (!isApiError(error)) {
    return fallbackDescription;
  }

  const fieldMessages = Object.values(error.fieldErrors ?? {})
    .flatMap((messages) => messages ?? [])
    .filter((message) => message.length > 0);

  if (fieldMessages.length > 0) {
    return Array.from(new Set(fieldMessages)).join(' ');
  }

  return error.message || fallbackDescription;
}

export async function readJsonResponse(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
