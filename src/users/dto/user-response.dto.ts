import { Exclude } from 'class-transformer';
import { UserRole, UserStatus } from '@prisma/client';

export class UserResponseDto {
  id: string;
  name: string;
  phone: string;
  email: string;

  @Exclude()
  password_hash: string;

  role: UserRole;
  status: UserStatus;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}
