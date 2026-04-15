import { UserRole } from '@prisma/client';

export type AuthActor = {
  id: string;
  role: UserRole;
};
