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

export function createApiErrorFromResponseBody(
  responseBody: unknown,
  options: {
    status: number;
  },
): ApiError {
  const apiErrorBody = parseApiErrorResponseBody(responseBody);

  if (!apiErrorBody) {
    // Malformed API error bodies have no user-safe backend message.
    return createApiError('', {
      status: options.status,
    });
  }

  return createApiError(apiErrorBody.message, {
    code: apiErrorBody.code,
    fieldErrors: apiErrorBody.fieldErrors,
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

export function resolveApiErrorDescription<KnownCode extends string>(
  error: unknown,
  options: {
    describeKnownCode: (code: KnownCode) => string;
    fallbackDescription: string;
    isKnownCode: (code: string | undefined) => code is KnownCode;
  },
): string {
  if (!isApiError(error)) {
    return options.fallbackDescription;
  }

  if (options.isKnownCode(error.code)) {
    return options.describeKnownCode(error.code);
  }

  if (typeof error.code === 'string' && error.code.length > 0) {
    return error.message || options.fallbackDescription;
  }

  return options.fallbackDescription;
}

export async function readJsonResponse(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function parseApiErrorResponseBody(
  responseBody: unknown,
): { code: string; fieldErrors?: ApiFieldErrors; message: string } | null {
  if (!isRecord(responseBody)) {
    return null;
  }

  const { code, fieldErrors, message } = responseBody;

  if (
    typeof code !== 'string' ||
    code.length === 0 ||
    typeof message !== 'string' ||
    message.length === 0
  ) {
    return null;
  }

  return {
    code,
    fieldErrors: parseApiFieldErrors(fieldErrors),
    message,
  };
}

function parseApiFieldErrors(fieldErrors: unknown): ApiFieldErrors | undefined {
  if (fieldErrors === undefined) {
    return undefined;
  }

  if (!isRecord(fieldErrors)) {
    return undefined;
  }

  const parsedFieldErrors: ApiFieldErrors = {};

  for (const [field, messages] of Object.entries(fieldErrors)) {
    if (
      !Array.isArray(messages) ||
      messages.some((message) => typeof message !== 'string')
    ) {
      return undefined;
    }

    parsedFieldErrors[field] = messages;
  }

  return parsedFieldErrors;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
