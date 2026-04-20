import {
  Body,
  Controller,
  ForbiddenException,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user/current-user.decorator';
import { Roles } from '../common/decorators/roles/roles.decorator';
import { JwtGuard } from '../common/guards/jwt/jwt.guard';
import { RolesGuard } from '../common/guards/roles/roles.guard';
import { DeviceResponseDto } from '../devices/dto';
import { SyncDeviceDto } from './dto/sync-device.dto';
import { DeviceSyncService } from './device-sync.service';

type AuthActor = {
  id: string;
  role: UserRole;
};

@ApiTags('device-sync')
@Controller('device-sync')
@UseGuards(JwtGuard, RolesGuard)
export class DeviceSyncController {
  constructor(private readonly deviceSyncService: DeviceSyncService) {}

  @Post()
  @ApiOperation({ summary: 'Sync a device heartbeat' })
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  sync(
    @Body() syncDeviceDto: SyncDeviceDto,
    @CurrentUser('id') currentUserId: string,
    @CurrentUser('role') currentUserRole: UserRole,
  ): Promise<DeviceResponseDto> {
    return this.deviceSyncService.sync(
      syncDeviceDto,
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
