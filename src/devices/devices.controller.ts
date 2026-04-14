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
import {
  CreateDeviceDto,
  DeviceResponseDto,
  FindAllDevicesQueryDto,
  UpdateDeviceDto,
} from './dto';
import { DevicesService } from './devices.service';

type AuthActor = {
  id: string;
  role: UserRole;
};

@ApiTags('devices')
@Controller('devices')
@UseGuards(JwtGuard, RolesGuard)
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new device' })
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  async create(
    @Body() createDeviceDto: CreateDeviceDto,
    @CurrentUser('id') currentUserId: string,
    @CurrentUser('role') currentUserRole: UserRole,
  ): Promise<DeviceResponseDto> {
    return this.devicesService.create(
      createDeviceDto,
      this.getActor(currentUserId, currentUserRole),
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get devices' })
  @Roles(UserRole.ADMIN, UserRole.AGENT, UserRole.CUSTOMER)
  async findAll(
    @Query() query: FindAllDevicesQueryDto,
    @CurrentUser('id') currentUserId: string,
    @CurrentUser('role') currentUserRole: UserRole,
  ): Promise<DeviceResponseDto[]> {
    return this.devicesService.findAll(
      query,
      this.getActor(currentUserId, currentUserRole),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a device by ID' })
  @Roles(UserRole.ADMIN, UserRole.AGENT, UserRole.CUSTOMER)
  async findOne(
    @Param('id') id: string,
    @CurrentUser('id') currentUserId: string,
    @CurrentUser('role') currentUserRole: UserRole,
  ): Promise<DeviceResponseDto> {
    return this.devicesService.findOne(
      id,
      this.getActor(currentUserId, currentUserRole),
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a device' })
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  async update(
    @Param('id') id: string,
    @Body() updateDeviceDto: UpdateDeviceDto,
    @CurrentUser('id') currentUserId: string,
    @CurrentUser('role') currentUserRole: UserRole,
  ): Promise<DeviceResponseDto> {
    return this.devicesService.update(
      id,
      updateDeviceDto,
      this.getActor(currentUserId, currentUserRole),
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete a device' })
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  async delete(
    @Param('id') id: string,
    @CurrentUser('id') currentUserId: string,
    @CurrentUser('role') currentUserRole: UserRole,
  ): Promise<{ message: string }> {
    return this.devicesService.delete(
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
