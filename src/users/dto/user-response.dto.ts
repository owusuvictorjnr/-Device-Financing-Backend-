import { UserRole, UserStatus } from '@prisma/client';

export class UserResponseDto {
  id: string;
  name: string;
  phone: string;
  email: string;

  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
