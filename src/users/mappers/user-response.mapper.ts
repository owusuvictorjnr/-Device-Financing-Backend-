import type { User } from '@prisma/client';
import type { UserResponseDto } from '../dto';

export const mapUserToResponseDto = (user: User): UserResponseDto => {
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    email: user.email,
    role: user.role,
    status: user.status,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
    deletedAt: user.deleted_at,
  };
};
