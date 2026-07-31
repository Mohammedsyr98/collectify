import {
  ownerSignUpErrorResponseSchema,
  ownerSignUpResponseSchema,
  type HealthResponse,
  type OwnerSignUpErrorCode,
  type OwnerSignUpFieldErrors,
  type OwnerSignUpRequest,
  type OwnerSignUpResponse,
  type SessionResponse,
} from '@collectify/contracts';

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

export class ApiError extends Error {
  readonly status: number;

  readonly code?: OwnerSignUpErrorCode;

  readonly fieldErrors?: OwnerSignUpFieldErrors;

  constructor(
    message: string,
    options: {
      status: number;
      code?: OwnerSignUpErrorCode;
      fieldErrors?: OwnerSignUpFieldErrors;
    },
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = options.status;
    this.code = options.code;
    this.fieldErrors = options.fieldErrors;
  }
}

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
    const errorResult = ownerSignUpErrorResponseSchema.safeParse(responseBody);

    if (errorResult.success) {
      throw new ApiError(errorResult.data.message, {
        status: response.status,
        code: errorResult.data.code,
        fieldErrors: errorResult.data.fieldErrors,
      });
    }

    throw new ApiError(`Owner sign-up failed with status ${response.status}`, {
      status: response.status,
    });
  }

  const signUpResult = ownerSignUpResponseSchema.safeParse(responseBody);

  if (!signUpResult.success) {
    throw new ApiError('Owner sign-up returned an unexpected response.', {
      status: response.status,
    });
  }

  return signUpResult.data;
}

async function readJsonResponse(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
