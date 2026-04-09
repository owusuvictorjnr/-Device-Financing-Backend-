import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import { compare } from 'bcrypt';
import { UsersService } from '../users/users.service';
import { UserResponseDto } from '../users/dto';
import { AuthResponseDto, LoginDto, RegisterDto } from './dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<UserResponseDto> {
    return await this.usersService.create({
      ...registerDto,
      role: UserRole.CUSTOMER,
    });
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.usersService.findByEmail(loginDto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await compare(
      loginDto.password,
      user.password_hash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        status: user.status,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        deletedAt: user.deleted_at,
      },
    };
  }
}
