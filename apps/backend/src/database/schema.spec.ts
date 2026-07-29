import { getTableConfig, type PgTable } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';

import {
  account,
  ownerProfiles,
  session,
  user,
  verification,
} from './schema';

function columnNames(table: PgTable): string[] {
  return getTableConfig(table).columns.map((column) => column.name);
}

describe('database schema', () => {
  it('defines the Better Auth persistence tables', () => {
    expect(getTableConfig(user).name).toBe('user');
    expect(columnNames(user)).toEqual([
      'id',
      'name',
      'email',
      'email_verified',
      'image',
      'created_at',
      'updated_at',
    ]);

    expect(getTableConfig(session).name).toBe('session');
    expect(columnNames(session)).toContain('token');
    expect(columnNames(session)).toContain('user_id');

    expect(getTableConfig(account).name).toBe('account');
    expect(columnNames(account)).toContain('provider_id');
    expect(columnNames(account)).toContain('password');

    expect(getTableConfig(verification).name).toBe('verification');
    expect(columnNames(verification)).toContain('identifier');
    expect(columnNames(verification)).toContain('expires_at');
  });

  it('defines one owner profile per Better Auth user', () => {
    const ownerProfileConfig = getTableConfig(ownerProfiles);

    expect(ownerProfileConfig.name).toBe('owner_profiles');
    expect(columnNames(ownerProfiles)).toEqual([
      'id',
      'user_id',
      'preferred_language',
      'default_currency',
      'created_at',
      'updated_at',
    ]);
    expect(ownerProfileConfig.foreignKeys).toHaveLength(1);
    expect(
      ownerProfileConfig.columns.find((column) => column.name === 'user_id')?.isUnique,
    ).toBe(true);
  });
});
