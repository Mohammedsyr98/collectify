import { HttpException } from '@nestjs/common';
import {
  authValidationCode,
  ownerSignUpRequestSchema,
} from '@collectify/contracts';
import { describe, expect, it } from 'vitest';

import { ZodValidationPipe, type ZodSchema } from './zod-validation.pipe';

describe('ZodValidationPipe', () => {
  it('returns the parsed schema output', () => {
    const pipe = new ZodValidationPipe(ownerSignUpRequestSchema);

    expect(
      pipe.transform({
        name: '  Owner  ',
        email: '  OWNER@EXAMPLE.COM  ',
        password: 'password123',
        preferredLanguage: 'en',
        defaultCurrency: 'USD',
      }),
    ).toEqual({
      name: 'Owner',
      email: 'owner@example.com',
      password: 'password123',
      preferredLanguage: 'en',
      defaultCurrency: 'USD',
    });
  });

  it('throws the default controlled validation error with schema messages', () => {
    const pipe = new ZodValidationPipe(ownerSignUpRequestSchema);

    try {
      pipe.transform({
        name: '',
        email: 'not-an-email',
        password: 'short',
        preferredLanguage: 'fr',
        defaultCurrency: 'GBP',
      });
      expect.unreachable('expected validation to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(400);
      expect((error as HttpException).getResponse()).toEqual({
        code: 'VALIDATION_ERROR',
        message: 'Check the highlighted fields.',
        fieldErrors: {
          name: [authValidationCode.authNameRequired],
          email: [authValidationCode.authEmailInvalid],
          password: [authValidationCode.authSignUpPasswordLength],
          preferredLanguage: [
            authValidationCode.authPreferredLanguageUnsupported,
          ],
          defaultCurrency: [
            authValidationCode.authDefaultCurrencyUnsupported,
          ],
        },
      });
    }
  });

  it('uses the provided message resolver for field error messages', () => {
    const pipe = new ZodValidationPipe(ownerSignUpRequestSchema, {
      resolveIssueMessage: (message) =>
        message === authValidationCode.authNameRequired
          ? 'Name is required.'
          : message,
    });

    try {
      pipe.transform({
        name: '',
        email: 'owner@example.com',
        password: 'password123',
        preferredLanguage: 'en',
        defaultCurrency: 'TRY',
      });
      expect.unreachable('expected validation to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getResponse()).toMatchObject({
        fieldErrors: {
          name: ['Name is required.'],
        },
      });
    }
  });

  it('passes through unknown validation messages unchanged', () => {
    const schema: ZodSchema<unknown> = {
      safeParse: () =>
        ({
          success: false,
          error: {
            issues: [
              {
                path: ['reference'],
                message: 'Reference is required.',
              },
            ],
          },
        }),
    };
    const pipe = new ZodValidationPipe(schema);

    try {
      pipe.transform({ reference: '' });
      expect.unreachable('expected validation to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getResponse()).toMatchObject({
        fieldErrors: {
          reference: ['Reference is required.'],
        },
      });
    }
  });

  it('groups multiple issues by field through the pipe interface', () => {
    const schema: ZodSchema<unknown> = {
      safeParse: () =>
        ({
          success: false,
          error: {
            issues: [
              {
                path: ['email'],
                message: 'Email is required.',
              },
              {
                path: ['email'],
                message: 'Email must be valid.',
              },
              {
                path: ['password'],
                message: 'Password is required.',
              },
              {
                path: [0],
                message: 'Ignored non-field issue.',
              },
            ],
          },
        }),
    };
    const pipe = new ZodValidationPipe(schema);

    try {
      pipe.transform({});
      expect.unreachable('expected validation to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getResponse()).toEqual({
        code: 'VALIDATION_ERROR',
        message: 'Check the highlighted fields.',
        fieldErrors: {
          email: ['Email is required.', 'Email must be valid.'],
          password: ['Password is required.'],
        },
      });
    }
  });
});
