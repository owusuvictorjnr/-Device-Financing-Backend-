import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { hash } from 'bcrypt';
import type { User } from '@prisma/client';
import {
  getPrismaUniqueConstraintTarget,
  isPrismaErrorCode,
} from '../common/prisma/prisma-error.utils';
import { PrismaService } from '../database/prisma.service';
import { CreateUserDto, UpdateUserDto, UserResponseDto } from './dto';
import { mapUserToResponseDto } from './mappers/user-response.mapper';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const { password, ...userData } = createUserDto;

    // Check if user with email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new BadRequestException('Email already in use');
    }

    // Check if user with phone already exists
    const existingPhone = await this.prisma.user.findUnique({
      where: { phone: createUserDto.phone },
    });

    if (existingPhone) {
      throw new BadRequestException('Phone number already in use');
    }

    // Hash password
    const passwordHash = await hash(password, 10);

    try {
      // Create user
      const user = await this.prisma.user.create({
        data: {
          ...userData,
          password_hash: passwordHash,
        },
      });

      return mapUserToResponseDto(user);
    } catch (error: unknown) {
      this.handleUniqueConstraintError(error);
      throw error;
    }
  }

  async findAll(skip = 0, take = 10): Promise<UserResponseDto[]> {
    const users = await this.prisma.user.findMany({
      where: { deleted_at: null },
      skip,
      take,
      orderBy: { created_at: 'desc' },
    });

    return users.map((user) => mapUserToResponseDto(user));
  }

  async findOne(id: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user || user.deleted_at) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return mapUserToResponseDto(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.prisma.user.findFirst({
      where: {
        email,
        deleted_at: null,
      },
    });
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    // Check if user exists
    await this.findOne(id);

    const { password, ...userData } = updateUserDto;
    const dataToUpdate = {
      ...userData,
      ...(password ? { password_hash: await hash(password, 10) } : {}),
    };

    // Check if email is being changed and if it's already in use
    if (updateUserDto.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: updateUserDto.email },
      });

      if (existingUser && existingUser.id !== id) {
        throw new BadRequestException('Email already in use');
      }
    }

    // Check if phone is being changed and if it's already in use
    if (updateUserDto.phone) {
      const existingUser = await this.prisma.user.findUnique({
        where: { phone: updateUserDto.phone },
      });

      if (existingUser && existingUser.id !== id) {
        throw new BadRequestException('Phone number already in use');
      }
    }

    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: dataToUpdate,
      });

      return mapUserToResponseDto(user);
    } catch (error: unknown) {
      this.handleUniqueConstraintError(error);
      this.handleRecordNotFoundError(error, id);
      throw error;
    }
  }

  async delete(id: string): Promise<{ message: string }> {
    // Check if user exists
    await this.findOne(id);

    await this.prisma.user.update({
      where: { id },
      data: { deleted_at: new Date() },
    });

    return { message: `User ${id} has been deleted` };
  }

  private handleUniqueConstraintError(error: unknown): void {
    if (!isPrismaErrorCode(error, 'P2002')) {
      return;
    }

    const target = getPrismaUniqueConstraintTarget(error);

    if (target.includes('email')) {
      throw new BadRequestException('Email already in use');
    }

    if (target.includes('phone')) {
      throw new BadRequestException('Phone number already in use');
    }

    throw new BadRequestException('User with provided details already exists');
  }

  private handleRecordNotFoundError(error: unknown, id: string): void {
    if (!isPrismaErrorCode(error, 'P2025')) {
      return;
    }

    throw new NotFoundException(`User with ID ${id} not found`);
  }
}
