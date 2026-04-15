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
import { CreatePaymentDto } from './dto/create-payment.dto';
import { FindAllPaymentsQueryDto } from './dto/find-all-payments-query.dto';
import { PaymentResponseDto } from './dto/payment-response.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { PaymentsService } from './payments.service';
import { AuthActor } from './payments.types';

@ApiTags('payments')
@Controller('payments')
@UseGuards(JwtGuard, RolesGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a payment' })
  @Roles(UserRole.ADMIN, UserRole.AGENT, UserRole.CUSTOMER)
  async create(
    @Body() createPaymentDto: CreatePaymentDto,
    @CurrentUser('id') currentUserId: string,
    @CurrentUser('role') currentUserRole: UserRole,
  ): Promise<PaymentResponseDto> {
    const result = await this.paymentsService.create(
      createPaymentDto,
      this.getActor(currentUserId, currentUserRole),
    );

    return result;
  }

  @Get()
  @ApiOperation({ summary: 'Get payments' })
  @Roles(UserRole.ADMIN, UserRole.AGENT, UserRole.CUSTOMER)
  async findAll(
    @Query() query: FindAllPaymentsQueryDto,
    @CurrentUser('id') currentUserId: string,
    @CurrentUser('role') currentUserRole: UserRole,
  ): Promise<PaymentResponseDto[]> {
    const result = await this.paymentsService.findAll(
      query,
      this.getActor(currentUserId, currentUserRole),
    );

    return result;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a payment by ID' })
  @Roles(UserRole.ADMIN, UserRole.AGENT, UserRole.CUSTOMER)
  async findOne(
    @Param('id') id: string,
    @CurrentUser('id') currentUserId: string,
    @CurrentUser('role') currentUserRole: UserRole,
  ): Promise<PaymentResponseDto> {
    const result = await this.paymentsService.findOne(
      id,
      this.getActor(currentUserId, currentUserRole),
    );

    return result;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a payment' })
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  async update(
    @Param('id') id: string,
    @Body() updatePaymentDto: UpdatePaymentDto,
    @CurrentUser('id') currentUserId: string,
    @CurrentUser('role') currentUserRole: UserRole,
  ): Promise<PaymentResponseDto> {
    const result = await this.paymentsService.update(
      id,
      updatePaymentDto,
      this.getActor(currentUserId, currentUserRole),
    );

    return result;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete a payment' })
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  async delete(
    @Param('id') id: string,
    @CurrentUser('id') currentUserId: string,
    @CurrentUser('role') currentUserRole: UserRole,
  ): Promise<{ message: string }> {
    const result = await this.paymentsService.delete(
      id,
      this.getActor(currentUserId, currentUserRole),
    );

    return result;
  }

  private getActor(id: string, role: UserRole): AuthActor {
    if (!id || !role) {
      throw new ForbiddenException('Missing authenticated user context');
    }

    return { id, role };
  }
}
