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

export type ZodValidationIssueMessageResolver = (message: string) => string;

export interface ZodValidationPipeOptions {
  resolveIssueMessage?: ZodValidationIssueMessageResolver;
}

export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(
    private readonly schema: ZodSchema<T>,
    private readonly options: ZodValidationPipeOptions = {},
  ) {}

  transform(value: unknown): T {
    const parsed = this.schema.safeParse(value);

    if (parsed.success) {
      return parsed.data;
    }

    throw createZodValidationException(
      parsed.error,
      this.options.resolveIssueMessage ?? defaultIssueMessageResolver,
    );
  }
}

const defaultIssueMessageResolver: ZodValidationIssueMessageResolver = (
  message,
) => message;

function createZodValidationException(
  error: ZodValidationError,
  resolveIssueMessage: ZodValidationIssueMessageResolver,
): HttpException {
  return new HttpException(
    {
      code: 'VALIDATION_ERROR',
      message: 'Check the highlighted fields.',
      fieldErrors: fieldErrorsFromZodError(error, resolveIssueMessage),
    },
    HttpStatus.BAD_REQUEST,
  );
}

function fieldErrorsFromZodError(
  error: ZodValidationError,
  resolveIssueMessage: ZodValidationIssueMessageResolver,
): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const field = issue.path[0];

    if (typeof field !== 'string') {
      continue;
    }

    fieldErrors[field] = [
      ...(fieldErrors[field] ?? []),
      resolveIssueMessage(issue.message),
    ];
  }

  return fieldErrors;
}
