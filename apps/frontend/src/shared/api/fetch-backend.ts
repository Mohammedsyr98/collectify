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

type FetchBackendOptions<TResponse> = {
  body?: unknown;
  method: BackendMethod;
  path: `/${string}`;
  responseSchema: BackendResponseSchema<TResponse>;
  unexpectedMessage: string;
};

export async function fetchBackend<TResponse>({
  body,
  method,
  path,
  responseSchema,
  unexpectedMessage,
}: FetchBackendOptions<TResponse>): Promise<TResponse> {
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
  const responseBody = await readJsonResponse(response);

  if (!response.ok) {
    throw createApiErrorFromResponseBody(responseBody, {
      status: response.status,
    });
  }

  const responseResult = responseSchema.safeParse(responseBody);

  if (!responseResult.success) {
    throw createApiError(unexpectedMessage, {
      status: response.status,
    });
  }

  return responseResult.data;
}
