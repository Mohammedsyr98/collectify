import { APIError } from 'better-auth';
import { isAPIError } from 'better-auth/utils/is-api-error';

declare const error: unknown;
if (error instanceof APIError) {
  error.body;
  error.statusCode;
}
if (isAPIError(error)) {
  error.body;
  error.statusCode;
}
