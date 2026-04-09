import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { hash } from 'bcrypt';
import type { User } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateUserDto, UpdateUserDto, UserResponseDto } from './dto';

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
    const password_hash = await hash(password, 10);

    try {
      // Create user
      const user = await this.prisma.user.create({
        data: {
          ...userData,
          password_hash,
        },
      });

      return this.toResponseDto(user);
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

    return users.map((user) => this.toResponseDto(user));
  }

  async findOne(id: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user || user.deleted_at) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return this.toResponseDto(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.prisma.user.findUnique({
      where: { email },
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

      return this.toResponseDto(user);
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

  private toResponseDto(user: User): UserResponseDto {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash, ...rest } = user;
    return rest as UserResponseDto;
  }

  private handleUniqueConstraintError(error: unknown): void {
    if (!this.isPrismaUniqueConstraintError(error)) {
      return;
    }

    const target = this.getUniqueConstraintTarget(error);

    if (target.includes('email')) {
      throw new BadRequestException('Email already in use');
    }

    if (target.includes('phone')) {
      throw new BadRequestException('Phone number already in use');
    }

    throw new BadRequestException('User with provided details already exists');
  }

  private isPrismaUniqueConstraintError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    return (error as { code?: unknown }).code === 'P2002';
  }

  private handleRecordNotFoundError(error: unknown, id: string): void {
    if (!this.isPrismaRecordNotFoundError(error)) {
      return;
    }

    throw new NotFoundException(`User with ID ${id} not found`);
  }

  private isPrismaRecordNotFoundError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    return (error as { code?: unknown }).code === 'P2025';
  }

  private getUniqueConstraintTarget(error: unknown): string[] {
    if (!error || typeof error !== 'object') {
      return [];
    }

    const meta = (error as { meta?: unknown }).meta;
    if (!meta || typeof meta !== 'object') {
      return [];
    }

    const target = (meta as { target?: unknown }).target;

    if (typeof target === 'string') {
      return [target];
    }

    if (Array.isArray(target)) {
      return target.filter((item): item is string => typeof item === 'string');
    }

    return [];
  }
}
