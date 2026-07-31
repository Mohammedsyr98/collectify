import { HttpException } from '@nestjs/common';
import { ownerSignUpRequestSchema } from '@collectify/contracts';
import { describe, expect, it } from 'vitest';

import { ZodValidationPipe } from './zod-validation.pipe';

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

  it('throws the default controlled validation error for invalid input', () => {
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
          name: ['Name is required.'],
          email: ['Enter a valid email address.'],
          password: ['Password must be between 8 and 128 characters.'],
          preferredLanguage: ['Choose English or Turkish.'],
          defaultCurrency: ['Choose TRY, USD, or EUR.'],
        },
      });
    }
  });

  it('uses the route exception factory when one is provided', () => {
    const exception = new HttpException({
      code: 'CUSTOM_VALIDATION_ERROR',
    }, 400);
    const pipe = new ZodValidationPipe(ownerSignUpRequestSchema, () => exception);

    expect(() => pipe.transform({ name: '' })).toThrow(exception);
  });
});
