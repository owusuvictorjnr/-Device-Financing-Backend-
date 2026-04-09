import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, UserResponseDto } from './dto';
import { JwtGuard } from '../common/guards/jwt/jwt.guard';
import { RolesGuard } from '../common/guards/roles/roles.guard';
import { Roles } from '../common/decorators/roles/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @Roles(UserRole.ADMIN)
  async create(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all users' })
  @Roles(UserRole.ADMIN)
  async findAll(
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query('take', new DefaultValuePipe(10), ParseIntPipe) take: number,
  ): Promise<UserResponseDto[]> {
    return this.usersService.findAll(skip, take);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @Roles(UserRole.ADMIN)
  async findOne(@Param('id') id: string): Promise<UserResponseDto> {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user' })
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser('id') currentUserId: string,
    @CurrentUser('role') currentUserRole: UserRole,
  ): Promise<UserResponseDto> {
    // Authorization: ADMIN can update anyone, non-ADMIN can only update themselves
    if (currentUserRole !== UserRole.ADMIN && currentUserId !== id) {
      throw new ForbiddenException('You can only update your own profile');
    }

    // Field-level restrictions: non-ADMIN users cannot change role or status
    if (currentUserRole !== UserRole.ADMIN) {
      delete updateUserDto.role;
      delete updateUserDto.status;
    }

    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete user (soft delete)' })
  @Roles(UserRole.ADMIN)
  async delete(@Param('id') id: string): Promise<{ message: string }> {
    return this.usersService.delete(id);
  }
}
