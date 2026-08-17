import { Injectable, UnauthorizedException } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { DatabaseService } from '../../database/database.service';
import { ownerProfiles } from '../../database/schema';
import { ownerProfileMissingException } from './owner-context.errors';
import type {
  AuthenticatedOwner,
  AuthenticatedOwnerProfile,
  OwnerContextAuthUser,
} from './owner-context';

@Injectable()
export class OwnerContextService {
  constructor(private readonly databaseService: DatabaseService) {}

  async findOwnerProfileForUser(
    userId: string,
  ): Promise<AuthenticatedOwnerProfile | null> {
    const [ownerProfile] = await this.databaseService.db
      .select({
        id: ownerProfiles.id,
        userId: ownerProfiles.userId,
        preferredLanguage: ownerProfiles.preferredLanguage,
        defaultCurrency: ownerProfiles.defaultCurrency,
      })
      .from(ownerProfiles)
      .where(eq(ownerProfiles.userId, userId))
      .limit(1);

    return ownerProfile ?? null;
  }

  async requireOwnerContext(
    user: OwnerContextAuthUser | null | undefined,
  ): Promise<AuthenticatedOwner> {
    if (!user) {
      throw new UnauthorizedException();
    }

    const ownerProfile = await this.findOwnerProfileForUser(user.id);

    if (!ownerProfile) {
      throw ownerProfileMissingException();
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name ?? null,
      },
      ownerProfile,
    };
  }
}
