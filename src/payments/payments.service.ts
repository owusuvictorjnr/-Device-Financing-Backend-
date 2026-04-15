import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PaymentMethod,
  PaymentRecordedBy,
  PaymentStatus,
  Prisma,
  UserRole,
} from '@prisma/client';
import {
  getPrismaUniqueConstraintTarget,
  isPrismaErrorCode,
} from '../common/prisma/prisma-error.utils';
import { PrismaService } from '../database/prisma.service';
import {
  CreatePaymentDto,
  FindAllPaymentsQueryDto,
  PaymentResponseDto,
  UpdatePaymentDto,
} from './dto';
import { AuthActor } from './payments.types';

type PaymentRecord = {
  id: string;
  loan_id: string;
  amount: Prisma.Decimal;
  payment_method: PaymentMethod;
  reference: string;
  status: PaymentStatus;
  paid_at: Date | null;
  recorded_by: PaymentRecordedBy;
  recorded_by_id: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  loan: {
    customer_id: string;
    agent_id: string;
  };
};

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    createPaymentDto: CreatePaymentDto,
    actor: AuthActor,
  ): Promise<PaymentResponseDto> {
    const loan = await this.getActiveLoanById(createPaymentDto.loanId);
    await this.assertLoanAccess(loan, actor);

    if (loan.status === 'PAID') {
      throw new BadRequestException('Cannot record payment for a paid loan');
    }

    const status = createPaymentDto.status ?? PaymentStatus.COMPLETED;
    const paidAt =
      createPaymentDto.paidAt ??
      (status === PaymentStatus.COMPLETED ? new Date() : null);

    const recordedBy = this.resolveRecordedBy(actor.role);

    try {
      const payment = await this.prisma.payment.create({
        data: {
          loan_id: createPaymentDto.loanId,
          amount: createPaymentDto.amount,
          payment_method: createPaymentDto.paymentMethod,
          reference: createPaymentDto.reference,
          status,
          paid_at: paidAt,
          recorded_by: recordedBy,
          recorded_by_id: actor.id,
        },
        include: {
          loan: {
            select: {
              customer_id: true,
              agent_id: true,
            },
          },
        },
      });

      return this.mapPaymentToResponseDto(payment);
    } catch (error: unknown) {
      this.handleUniqueConstraintError(error);
      this.handleRelatedRecordNotFoundError(error);
      throw error;
    }
  }

  async findAll(
    query: FindAllPaymentsQueryDto,
    actor: AuthActor,
  ): Promise<PaymentResponseDto[]> {
    const where: Prisma.PaymentWhereInput = {
      deleted_at: null,
    };

    if (query.loanId) {
      where.loan_id = query.loanId;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.paymentMethod) {
      where.payment_method = query.paymentMethod;
    }
    if (query.recordedBy) {
      where.recorded_by = query.recordedBy;
    }
    if (query.reference) {
      where.reference = query.reference;
    }

    if (actor.role === UserRole.ADMIN) {
      if (query.customerId) {
        where.loan = {
          customer_id: query.customerId,
        };
      }
    } else if (actor.role === UserRole.AGENT) {
      where.loan = {
        ...(query.customerId ? { customer_id: query.customerId } : {}),
        agent_id: actor.id,
      };
    } else {
      const customer = await this.getActiveCustomerByUserId(actor.id);
      if (query.customerId && query.customerId !== customer.id) {
        throw new ForbiddenException('You can only access your own payments');
      }

      where.loan = {
        customer_id: customer.id,
      };
    }

    const payments = await this.prisma.payment.findMany({
      where,
      skip: query.skip,
      take: query.take,
      orderBy: { created_at: 'desc' },
      include: {
        loan: {
          select: {
            customer_id: true,
            agent_id: true,
          },
        },
      },
    });

    return payments.map((payment) => this.mapPaymentToResponseDto(payment));
  }

  async findOne(id: string, actor: AuthActor): Promise<PaymentResponseDto> {
    const payment = await this.getPaymentById(id);
    await this.assertPaymentAccess(payment, actor);

    return this.mapPaymentToResponseDto(payment);
  }

  async update(
    id: string,
    updatePaymentDto: UpdatePaymentDto,
    actor: AuthActor,
  ): Promise<PaymentResponseDto> {
    if (actor.role === UserRole.CUSTOMER) {
      throw new ForbiddenException('Customers cannot update payments');
    }

    const payment = await this.getPaymentById(id);
    await this.assertPaymentAccess(payment, actor);

    const paidAt =
      updatePaymentDto.paidAt ??
      (updatePaymentDto.status === PaymentStatus.COMPLETED
        ? new Date()
        : undefined);

    try {
      const updated = await this.prisma.payment.update({
        where: { id },
        data: {
          ...(updatePaymentDto.amount !== undefined
            ? { amount: updatePaymentDto.amount }
            : {}),
          ...(updatePaymentDto.paymentMethod !== undefined
            ? { payment_method: updatePaymentDto.paymentMethod }
            : {}),
          ...(updatePaymentDto.reference !== undefined
            ? { reference: updatePaymentDto.reference }
            : {}),
          ...(updatePaymentDto.status !== undefined
            ? { status: updatePaymentDto.status }
            : {}),
          ...(paidAt !== undefined ? { paid_at: paidAt } : {}),
        },
        include: {
          loan: {
            select: {
              customer_id: true,
              agent_id: true,
            },
          },
        },
      });

      return this.mapPaymentToResponseDto(updated);
    } catch (error: unknown) {
      this.handleUniqueConstraintError(error);
      this.handleRecordNotFoundError(error, id);
      throw error;
    }
  }

  async delete(id: string, actor: AuthActor): Promise<{ message: string }> {
    if (actor.role === UserRole.CUSTOMER) {
      throw new ForbiddenException('Customers cannot delete payments');
    }

    const payment = await this.getPaymentById(id);
    await this.assertPaymentAccess(payment, actor);

    const result = await this.prisma.payment.updateMany({
      where: {
        id,
        deleted_at: null,
      },
      data: {
        deleted_at: new Date(),
      },
    });

    if (result.count === 0) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    return { message: `Payment ${id} has been deleted` };
  }

  private async getActiveLoanById(loanId: string): Promise<{
    id: string;
    customer_id: string;
    agent_id: string;
    status: string;
  }> {
    const loan = await this.prisma.loan.findFirst({
      where: {
        id: loanId,
        deleted_at: null,
      },
      select: {
        id: true,
        customer_id: true,
        agent_id: true,
        status: true,
      },
    });

    if (!loan) {
      throw new NotFoundException(`Loan with ID ${loanId} not found`);
    }

    return loan;
  }

  private async getPaymentById(id: string): Promise<PaymentRecord> {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        loan: {
          select: {
            customer_id: true,
            agent_id: true,
          },
        },
      },
    });

    if (!payment || payment.deleted_at) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    return payment;
  }

  private async getActiveCustomerByUserId(
    userId: string,
  ): Promise<{ id: string }> {
    const customer = await this.prisma.customer.findFirst({
      where: {
        user_id: userId,
        deleted_at: null,
      },
      select: { id: true },
    });

    if (!customer) {
      throw new ForbiddenException(
        'Authenticated user is not an active customer',
      );
    }

    return customer;
  }

  private async assertLoanAccess(
    loan: { customer_id: string; agent_id: string },
    actor: AuthActor,
  ): Promise<void> {
    if (actor.role === UserRole.ADMIN) {
      return;
    }

    if (actor.role === UserRole.AGENT) {
      if (loan.agent_id !== actor.id) {
        throw new ForbiddenException(
          'Agents can only access payments for their own loans',
        );
      }

      return;
    }

    const customer = await this.getActiveCustomerByUserId(actor.id);
    if (loan.customer_id !== customer.id) {
      throw new ForbiddenException('You can only access your own payments');
    }
  }

  private async assertPaymentAccess(
    payment: PaymentRecord,
    actor: AuthActor,
  ): Promise<void> {
    await this.assertLoanAccess(payment.loan, actor);
  }

  private resolveRecordedBy(role: UserRole): PaymentRecordedBy {
    if (role === UserRole.AGENT) {
      return PaymentRecordedBy.AGENT;
    }

    if (role === UserRole.CUSTOMER) {
      return PaymentRecordedBy.CUSTOMER;
    }

    return PaymentRecordedBy.SYSTEM;
  }

  private mapPaymentToResponseDto(payment: PaymentRecord): PaymentResponseDto {
    return {
      id: payment.id,
      loanId: payment.loan_id,
      amount: payment.amount.toString(),
      paymentMethod: payment.payment_method,
      reference: payment.reference,
      status: payment.status,
      paidAt: payment.paid_at,
      recordedBy: payment.recorded_by,
      recordedByUserId: payment.recorded_by_id,
      createdAt: payment.created_at,
      updatedAt: payment.updated_at,
      deletedAt: payment.deleted_at,
    };
  }

  private handleUniqueConstraintError(error: unknown): void {
    if (isPrismaErrorCode(error, 'P2002')) {
      const target = getPrismaUniqueConstraintTarget(error);
      const targetText = target.join(', ');

      if (target.includes('reference')) {
        throw new BadRequestException('Payment reference already exists');
      }

      throw new BadRequestException(
        `Payment violates unique constraint: ${targetText}`,
      );
    }
  }

  private handleRelatedRecordNotFoundError(error: unknown): void {
    if (isPrismaErrorCode(error, 'P2003')) {
      throw new BadRequestException(
        'Invalid relation reference in payment data',
      );
    }
  }

  private handleRecordNotFoundError(error: unknown, id: string): void {
    if (isPrismaErrorCode(error, 'P2025')) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }
  }
}
