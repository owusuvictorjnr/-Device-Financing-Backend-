import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user/current-user.decorator';
import { Roles } from '../common/decorators/roles/roles.decorator';
import { JwtGuard } from '../common/guards/jwt/jwt.guard';
import { RolesGuard } from '../common/guards/roles/roles.guard';
import type { AuthActor } from '../common/types/auth-actor.type';
import {
  CommandResponseDto,
  CreateCommandDto,
  FindAllCommandsQueryDto,
  UpdateCommandDto,
} from './dto';
import { CommandsService } from './commands.service';

@ApiTags('commands')
@Controller('commands')
@UseGuards(JwtGuard, RolesGuard)
export class CommandsController {
  constructor(private readonly commandsService: CommandsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a command' })
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  async create(
    @Body() createCommandDto: CreateCommandDto,
    @CurrentUser('id') currentUserId: string,
    @CurrentUser('role') currentUserRole: UserRole,
  ): Promise<CommandResponseDto> {
    return this.commandsService.create(
      createCommandDto,
      this.getActor(currentUserId, currentUserRole),
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get commands' })
  @Roles(UserRole.ADMIN, UserRole.AGENT, UserRole.CUSTOMER)
  async findAll(
    @Query() query: FindAllCommandsQueryDto,
    @CurrentUser('id') currentUserId: string,
    @CurrentUser('role') currentUserRole: UserRole,
  ): Promise<CommandResponseDto[]> {
    return this.commandsService.findAll(
      query,
      this.getActor(currentUserId, currentUserRole),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a command by ID' })
  @Roles(UserRole.ADMIN, UserRole.AGENT, UserRole.CUSTOMER)
  async findOne(
    @Param('id') id: string,
    @CurrentUser('id') currentUserId: string,
    @CurrentUser('role') currentUserRole: UserRole,
  ): Promise<CommandResponseDto> {
    return this.commandsService.findOne(
      id,
      this.getActor(currentUserId, currentUserRole),
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a command' })
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  async update(
    @Param('id') id: string,
    @Body() updateCommandDto: UpdateCommandDto,
    @CurrentUser('id') currentUserId: string,
    @CurrentUser('role') currentUserRole: UserRole,
  ): Promise<CommandResponseDto> {
    return this.commandsService.update(
      id,
      updateCommandDto,
      this.getActor(currentUserId, currentUserRole),
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete a command' })
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  async delete(
    @Param('id') id: string,
    @CurrentUser('id') currentUserId: string,
    @CurrentUser('role') currentUserRole: UserRole,
  ): Promise<{ message: string }> {
    return this.commandsService.delete(
      id,
      this.getActor(currentUserId, currentUserRole),
    );
  }

  private getActor(id: string, role: UserRole): AuthActor {
    if (!id || !role) {
      throw new ForbiddenException('Missing authenticated user context');
    }

    return { id, role };
  }
}
