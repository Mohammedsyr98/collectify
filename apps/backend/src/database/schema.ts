import {
  boolean,
  check,
  date,
  integer,
  index,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const ownerLanguageEnum = pgEnum('owner_language', ['en', 'tr', 'ar']);
export const currencyEnum = pgEnum('currency', ['TRY', 'USD', 'EUR']);

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull(),
  image: text('image'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
});

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at'),
  updatedAt: timestamp('updated_at'),
});

export const ownerProfiles = pgTable('owner_profiles', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: 'cascade' }),
  preferredLanguage: ownerLanguageEnum('preferred_language').notNull(),
  defaultCurrency: currencyEnum('default_currency').notNull(),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

export const customerConstraints = {
  ownerProfileLowerCodeUnique: 'customers_owner_profile_lower_code_unique',
} as const;

export const debtConstraints = {
  customerIdIndex: 'debts_customer_id_idx',
  totalAmountPositive: 'debts_total_amount_positive',
  schedulePositionPositive: 'debt_schedule_items_position_positive',
  scheduleAmountPositive: 'debt_schedule_items_amount_positive',
  debtPositionUnique: 'debt_schedule_items_debt_id_position_unique',
} as const;

export const customers = pgTable(
  'customers',
  {
    id: text('id').primaryKey(),
    ownerProfileId: text('owner_profile_id')
      .notNull()
      .references(() => ownerProfiles.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    code: text('code').notNull(),
    phoneNumber: text('phone_number').notNull(),
    address: text('address'),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
  },
  (table) => [
    uniqueIndex(customerConstraints.ownerProfileLowerCodeUnique).on(
      table.ownerProfileId,
      sql`lower(trim(${table.code}))`,
    ),
  ],
);

export const debts = pgTable(
  'debts',
  {
    id: text('id').primaryKey(),
    customerId: text('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    description: text('description').notNull(),
    totalAmount: numeric('total_amount', { precision: 18, scale: 2 }).notNull(),
    currency: currencyEnum('currency').notNull(),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
  },
  (table) => [
    index(debtConstraints.customerIdIndex).on(table.customerId),
    check(debtConstraints.totalAmountPositive, sql`${table.totalAmount} > 0`),
  ],
);

export const debtScheduleItems = pgTable(
  'debt_schedule_items',
  {
    id: text('id').primaryKey(),
    debtId: text('debt_id')
      .notNull()
      .references(() => debts.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    amount: numeric('amount', { precision: 18, scale: 2 }).notNull(),
    dueDate: date('due_date', { mode: 'string' }).notNull(),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
  },
  (table) => [
    check(
      debtConstraints.schedulePositionPositive,
      sql`${table.position} > 0`,
    ),
    check(debtConstraints.scheduleAmountPositive, sql`${table.amount} > 0`),
    uniqueIndex(debtConstraints.debtPositionUnique).on(
      table.debtId,
      table.position,
    ),
  ],
);
