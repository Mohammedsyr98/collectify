import {
  createApiError,
  createApiErrorFromResponseBody,
  getBackendUrl,
  readJsonResponse,
} from './http';

type BackendMethod = 'DELETE' | 'GET' | 'PATCH' | 'POST' | 'PUT';

type BackendResponseSchema<TResponse> = {
  safeParse: (
    value: unknown,
  ) => { data: TResponse; success: true } | { success: false };
};

type FetchBackendJsonOptions<TResponse> = {
  body?: unknown;
  method: BackendMethod;
  path: `/${string}`;
  responseSchema: BackendResponseSchema<TResponse>;
  responseMode?: 'json';
  unexpectedMessage: string;
};

type FetchBackendNoContentOptions = {
  body?: unknown;
  method: BackendMethod;
  path: `/${string}`;
  responseMode: 'noContent';
  unexpectedMessage: string;
};

export function fetchBackend<TResponse>(
  options: FetchBackendJsonOptions<TResponse>,
): Promise<TResponse>;
export function fetchBackend(
  options: FetchBackendNoContentOptions,
): Promise<void>;
export async function fetchBackend<TResponse>(
  options: FetchBackendJsonOptions<TResponse> | FetchBackendNoContentOptions,
): Promise<TResponse | void> {
  const { body, method, path, unexpectedMessage } = options;
  const requestInit: RequestInit = {
    method,
    credentials: 'include',
  };

  if (body !== undefined) {
    requestInit.headers = {
      'content-type': 'application/json',
    };
    requestInit.body = JSON.stringify(body);
  }

  const response = await fetch(`${getBackendUrl()}${path}`, requestInit);

  if (!response.ok) {
    const responseBody = await readJsonResponse(response);
    throw createApiErrorFromResponseBody(responseBody, {
      status: response.status,
    });
  }

  if (options.responseMode === 'noContent') {
    if (response.status !== 204) {
      throw createApiError(unexpectedMessage, {
        status: response.status,
      });
    }

    return;
  }

  const responseSchema = options.responseSchema;
  const responseBody = await readJsonResponse(response);
  const responseResult = responseSchema.safeParse(responseBody);

  if (!responseResult.success) {
    throw createApiError(unexpectedMessage, {
      status: response.status,
    });
  }

  return responseResult.data;
}
