import {
  HttpException,
  HttpStatus,
  type PipeTransform,
} from '@nestjs/common';

export interface ZodValidationError {
  issues: Array<{
    path: PropertyKey[];
    message: string;
  }>;
}

export interface ZodSchema<T> {
  safeParse(
    value: unknown,
  ):
    | {
        success: true;
        data: T;
      }
    | {
        success: false;
        error: ZodValidationError;
      };
}

export type ZodValidationExceptionFactory = (
  error: ZodValidationError,
) => Error;

export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(
    private readonly schema: ZodSchema<T>,
    private readonly createException: ZodValidationExceptionFactory = defaultExceptionFactory,
  ) {}

  transform(value: unknown): T {
    const parsed = this.schema.safeParse(value);

    if (parsed.success) {
      return parsed.data;
    }

    throw this.createException(parsed.error);
  }
}

function defaultExceptionFactory(error: ZodValidationError): HttpException {
  return new HttpException(
    {
      code: 'VALIDATION_ERROR',
      message: 'Check the highlighted fields.',
      fieldErrors: fieldErrorsFromZodError(error),
    },
    HttpStatus.BAD_REQUEST,
  );
}

function fieldErrorsFromZodError(
  error: ZodValidationError,
): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const field = issue.path[0];

    if (typeof field !== 'string') {
      continue;
    }

    fieldErrors[field] = [...(fieldErrors[field] ?? []), issue.message];
  }

  return fieldErrors;
}
