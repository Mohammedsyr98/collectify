import { Injectable } from '@nestjs/common';
import {
  paymentApiErrorCode,
  type Payment,
  type RecordPaymentRequest,
  type RecordPaymentResponse,
} from '@collectify/contracts';
import { and, eq } from 'drizzle-orm';
import { createHash, randomUUID } from 'node:crypto';

import type { AuthenticatedOwner } from '../auth';
import { DatabaseService, type Database } from '../database/database.service';
import { customers, debtScheduleItems, debts, payments } from '../database/schema';
import { findOwnedDebtForUpdate } from '../debts/debt-lock';
import { getIstanbulBusinessDate } from '../shared/istanbul-business-date';
import { loadPaidTotalsByScheduleItemId } from './schedule-item-payment-amounts';
import { paymentException } from './payments.errors';

type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
type PaymentRow = typeof payments.$inferSelect;
type ScheduleItemRow = typeof debtScheduleItems.$inferSelect;

@Injectable()
export class PaymentsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async recordPayment(
    currentOwner: AuthenticatedOwner,
    customerId: string,
    request: RecordPaymentRequest,
  ): Promise<RecordPaymentResponse> {
    const operationInstant = new Date();
    const businessDate = getIstanbulBusinessDate(operationInstant);

    if (request.paymentDate > businessDate) {
      throw paymentException(paymentApiErrorCode.paymentDateInFuture);
    }

    return this.databaseService.db.transaction(async (tx) => {
      const targetDebtId = await findPaymentTargetDebtId(tx, {
        ownerProfileId: currentOwner.ownerProfile.id,
        customerId,
        scheduleItemId: request.targetScheduleItemId,
      });

      if (!targetDebtId) {
        throw paymentException(paymentApiErrorCode.paymentTargetNotFound);
      }

      const debt = await findOwnedDebtForUpdate(tx, {
        ownerProfileId: currentOwner.ownerProfile.id,
        customerId,
        debtId: targetDebtId,
      });

      if (!debt) {
        throw paymentException(paymentApiErrorCode.paymentTargetNotFound);
      }

      const scheduleItem = await lockScheduleItem(
        tx,
        debt.id,
        request.targetScheduleItemId,
      );

      if (!scheduleItem) {
        throw paymentException(paymentApiErrorCode.paymentTargetNotFound);
      }

      const fingerprint = createPaymentFingerprint(request);
      const existingPayment = await findPaymentByIdempotencyKey(
        tx,
        request.idempotencyKey,
      );

      if (existingPayment) {
        if (existingPayment.requestFingerprint !== fingerprint) {
          throw paymentException(paymentApiErrorCode.paymentIdempotencyKeyReused);
        }

        return { payment: toPaymentResponse(existingPayment) };
      }

      if (debt.version !== request.expectedDebtVersion) {
        throw paymentException(paymentApiErrorCode.paymentDebtVersionConflict);
      }

      const paidTotals = await loadPaidTotalsByScheduleItemId(tx, [
        scheduleItem.id,
      ]);
      const paidAmount = parseMoney(paidTotals.get(scheduleItem.id) ?? '0.00');
      const targetAmount = parseMoney(scheduleItem.amount);
      const remainingAmount = targetAmount - paidAmount;

      if (remainingAmount <= 0n) {
        throw paymentException(paymentApiErrorCode.paymentTargetAlreadyPaid);
      }

      if (parseMoney(request.amount) > remainingAmount) {
        throw paymentException(
          paymentApiErrorCode.paymentAmountExceedsRemaining,
        );
      }

      const payment = await this.insertPayment(tx, {
        scheduleItemId: scheduleItem.id,
        request,
        fingerprint,
        operationInstant,
      });

      const [updatedDebt] = await tx
        .update(debts)
        .set({
          version: debt.version + 1,
          updatedAt: operationInstant,
        })
        .where(and(eq(debts.id, debt.id), eq(debts.version, debt.version)))
        .returning();

      if (!updatedDebt) {
        throw paymentException(paymentApiErrorCode.paymentDebtVersionConflict);
      }

      return { payment: toPaymentResponse(payment) };
    });
  }

  private async insertPayment(
    tx: Transaction,
    input: {
      scheduleItemId: string;
      request: RecordPaymentRequest;
      fingerprint: string;
      operationInstant: Date;
    },
  ): Promise<PaymentRow> {
    const values = {
      id: randomUUID(),
      scheduleItemId: input.scheduleItemId,
      amount: input.request.amount,
      paymentDate: input.request.paymentDate,
      note: input.request.note,
      idempotencyKey: input.request.idempotencyKey,
      requestFingerprint: input.fingerprint,
      createdAt: input.operationInstant,
      updatedAt: input.operationInstant,
    };

    try {
      return await tx.transaction(async (savepoint) => {
        const [payment] = await savepoint.insert(payments).values(values).returning();

        if (!payment) {
          throw new Error('Payment insert returned no row.');
        }

        return payment;
      });
    } catch (error) {
      if (!isPaymentIdempotencyUniqueViolation(error)) {
        throw error;
      }

      const existingPayment = await findPaymentByIdempotencyKey(
        tx,
        input.request.idempotencyKey,
      );

      if (!existingPayment) {
        throw error;
      }

      if (existingPayment.requestFingerprint !== input.fingerprint) {
        throw paymentException(paymentApiErrorCode.paymentIdempotencyKeyReused);
      }

      return existingPayment;
    }
  }

}

async function findPaymentTargetDebtId(
  tx: Transaction,
  input: {
    ownerProfileId: string;
    customerId: string;
    scheduleItemId: string;
  },
): Promise<string | null> {
  const [row] = await tx
    .select({ debtId: debtScheduleItems.debtId })
    .from(debtScheduleItems)
    .innerJoin(debts, eq(debts.id, debtScheduleItems.debtId))
    .innerJoin(customers, eq(customers.id, debts.customerId))
    .where(
      and(
        eq(debtScheduleItems.id, input.scheduleItemId),
        eq(debts.customerId, input.customerId),
        eq(customers.ownerProfileId, input.ownerProfileId),
      ),
    )
    .limit(1);

  return row?.debtId ?? null;
}

async function lockScheduleItem(
  tx: Transaction,
  debtId: string,
  scheduleItemId: string,
): Promise<ScheduleItemRow | null> {
  const [row] = await tx
    .select()
    .from(debtScheduleItems)
    .where(
      and(
        eq(debtScheduleItems.id, scheduleItemId),
        eq(debtScheduleItems.debtId, debtId),
      ),
    )
    .limit(1)
    .for('update');

  return row ?? null;
}

async function findPaymentByIdempotencyKey(
  tx: Pick<Database, 'select'>,
  idempotencyKey: string,
): Promise<PaymentRow | null> {
  const [payment] = await tx
    .select()
    .from(payments)
    .where(eq(payments.idempotencyKey, idempotencyKey))
    .limit(1);

  return payment ?? null;
}

function createPaymentFingerprint(request: RecordPaymentRequest): string {
  const logicalRequest = JSON.stringify({
    targetScheduleItemId: request.targetScheduleItemId,
    amount: request.amount,
    paymentDate: request.paymentDate,
    note: request.note,
    expectedDebtVersion: request.expectedDebtVersion,
  });

  return createHash('sha256').update(logicalRequest).digest('hex');
}

function toPaymentResponse(payment: PaymentRow): Payment {
  return {
    id: payment.id,
    scheduleItemId: payment.scheduleItemId,
    amount: payment.amount,
    paymentDate: payment.paymentDate,
    note: payment.note,
    idempotencyKey: payment.idempotencyKey,
    createdAt: payment.createdAt.toISOString(),
    updatedAt: payment.updatedAt.toISOString(),
  };
}

function isPaymentIdempotencyUniqueViolation(error: unknown): boolean {
  const postgresError =
    typeof error === 'object' && error !== null && 'cause' in error
      ? error.cause
      : error;

  return (
    typeof postgresError === 'object' &&
    postgresError !== null &&
    'code' in postgresError &&
    postgresError.code === '23505' &&
    'constraint' in postgresError &&
    postgresError.constraint === 'payments_idempotency_key_unique'
  );
}

function parseMoney(value: string): bigint {
  const [wholeAmount, fractionalAmount = ''] = value.split('.');
  return BigInt(wholeAmount!) * 100n + BigInt(fractionalAmount.padEnd(2, '0'));
}
