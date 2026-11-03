import { isMoneyWithinNumeric182Precision } from '@collectify/domain/money';
import { z } from 'zod';

export const moneySchema = z
  .string()
  .regex(/^\d+\.\d{2}$/)
  .refine(isMoneyWithinNumeric182Precision);
