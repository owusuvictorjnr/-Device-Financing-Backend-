import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LoanStatus, Prisma, UserRole, UserStatus } from '@prisma/client';
import dayjs from 'dayjs';
import {
  getPrismaUniqueConstraintTarget,
  isPrismaErrorCode,
} from '../common/prisma/prisma-error.utils';
import { PrismaService } from '../database/prisma.service';
import {
  CreateLoanDto,
  FindAllLoansQueryDto,
  LoanResponseDto,
  UpdateLoanDto,
} from './dto';

type AuthActor = {
  id: string;
  role: UserRole;
};

type LoanRecord = {
  id: string;
  customer_id: string;
  device_id: string;
  agent_id: string;
  principal_amount: Prisma.Decimal;
  installment_amount: Prisma.Decimal;
  duration_days: number;
  start_date: Date;
  due_date: Date;
  grace_period_days: number;
  status: LoanStatus;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
};

@Injectable()
export class LoansService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    createLoanDto: CreateLoanDto,
    actor: AuthActor,
  ): Promise<LoanResponseDto> {
    if (actor.role === UserRole.CUSTOMER) {
      throw new ForbiddenException('Customers cannot create loans');
    }

    const actorAgentProfileId =
      actor.role === UserRole.AGENT
        ? (await this.getActiveAgentProfileByUserId(actor.id)).id
        : undefined;

    const activeAgentUserId = await this.resolveLoanAgentUserId(
      actor,
      createLoanDto,
    );
    const customer = await this.getActiveCustomerById(createLoanDto.customerId);
    const device = await this.getActiveDeviceById(createLoanDto.deviceId);

    if (actorAgentProfileId) {
      if (customer.agent_id !== actorAgentProfileId) {
        throw new ForbiddenException(
          'Agents can only create loans for their own customers',
        );
      }
    }

    if (actor.role === UserRole.ADMIN) {
      const selectedAgentProfile =
        await this.getActiveAgentProfileByUserId(activeAgentUserId);

      if (customer.agent_id !== selectedAgentProfile.id) {
        throw new BadRequestException(
          'Selected agent is not assigned to this customer',
        );
      }
    }

    if (device.customer_id && device.customer_id !== customer.id) {
      throw new BadRequestException(
        'Device is assigned to a different customer',
      );
    }

    try {
      const loan = await this.prisma.$transaction(
        async (tx) => {
          const dueDate = this.computeDueDate(
            createLoanDto.startDate,
            createLoanDto.durationDays,
          );

          if (!device.customer_id) {
            const deviceAssignmentResult = await tx.device.updateMany({
              where: {
                id: device.id,
                customer_id: null,
                deleted_at: null,
              },
              data: {
                customer_id: customer.id,
              },
            });

            if (deviceAssignmentResult.count === 0) {
              const latestDevice = await tx.device.findUnique({
                where: { id: device.id },
                select: { customer_id: true },
              });

              if (latestDevice?.customer_id !== customer.id) {
                throw new BadRequestException(
                  'Device is assigned to a different customer',
                );
              }
            }
          }

          const existingOutstandingLoan = await tx.loan.findFirst({
            where: {
              device_id: createLoanDto.deviceId,
              status: {
                not: LoanStatus.PAID,
              },
              deleted_at: null,
            },
            select: { id: true },
          });

          if (existingOutstandingLoan) {
            throw new BadRequestException(
              'Device already has an outstanding loan',
            );
          }

          return tx.loan.create({
            data: {
              customer_id: createLoanDto.customerId,
              device_id: createLoanDto.deviceId,
              agent_id: activeAgentUserId,
              principal_amount: createLoanDto.principalAmount,
              installment_amount: createLoanDto.installmentAmount,
              duration_days: createLoanDto.durationDays,
              start_date: createLoanDto.startDate,
              due_date: dueDate,
              grace_period_days: createLoanDto.gracePeriodDays ?? 0,
              status: createLoanDto.status ?? LoanStatus.ACTIVE,
            },
          });
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );

      return this.mapLoanToResponseDto(loan);
    } catch (error: unknown) {
      this.handleUniqueConstraintError(error);
      this.handleRelatedRecordNotFoundError(error);
      throw error;
    }
  }

  async findAll(
    query: FindAllLoansQueryDto,
    actor: AuthActor,
  ): Promise<LoanResponseDto[]> {
    const where: {
      deleted_at: null;
      customer_id?: string;
      device_id?: string;
      agent_id?: string;
      status?: LoanStatus;
    } = {
      deleted_at: null,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.deviceId) {
      where.device_id = query.deviceId;
    }

    const queryAgentUserId = query.agentUserId;

    if (actor.role === UserRole.ADMIN) {
      if (query.customerId) {
        where.customer_id = query.customerId;
      }
      if (queryAgentUserId) {
        where.agent_id = queryAgentUserId;
      }
    } else if (actor.role === UserRole.AGENT) {
      where.agent_id = actor.id;

      if (queryAgentUserId && queryAgentUserId !== actor.id) {
        throw new ForbiddenException('Agents can only access their own loans');
      }

      if (query.customerId) {
        const customer = await this.getActiveCustomerById(query.customerId);
        const agentProfile = await this.getActiveAgentProfileByUserId(actor.id);
        if (customer.agent_id !== agentProfile.id) {
          throw new ForbiddenException(
            'Agents can only access loans for their own customers',
          );
        }
        where.customer_id = query.customerId;
      }
    } else {
      const customer = await this.getActiveCustomerByUserId(actor.id);
      if (query.customerId && query.customerId !== customer.id) {
        throw new ForbiddenException('You can only access your own loans');
      }

      where.customer_id = customer.id;
    }

    const loans = await this.prisma.loan.findMany({
      where,
      skip: query.skip,
      take: query.take,
      orderBy: { created_at: 'desc' },
    });

    return loans.map((loan) => this.mapLoanToResponseDto(loan));
  }

  async findOne(id: string, actor: AuthActor): Promise<LoanResponseDto> {
    const loan = await this.getLoanById(id);
    await this.assertLoanAccess(loan, actor);

    return this.mapLoanToResponseDto(loan);
  }

  async update(
    id: string,
    updateLoanDto: UpdateLoanDto,
    actor: AuthActor,
  ): Promise<LoanResponseDto> {
    if (actor.role === UserRole.CUSTOMER) {
      throw new ForbiddenException('Customers cannot update loans');
    }

    const loan = await this.getLoanById(id);
    await this.assertLoanAccess(loan, actor);

    const effectiveStartDate = updateLoanDto.startDate ?? loan.start_date;
    const effectiveDurationDays =
      updateLoanDto.durationDays ?? loan.duration_days;
    const shouldRecomputeDueDate =
      updateLoanDto.startDate !== undefined ||
      updateLoanDto.durationDays !== undefined;

    try {
      const updatedLoan = await this.prisma.loan.update({
        where: { id },
        data: {
          ...(updateLoanDto.principalAmount !== undefined
            ? { principal_amount: updateLoanDto.principalAmount }
            : {}),
          ...(updateLoanDto.installmentAmount !== undefined
            ? { installment_amount: updateLoanDto.installmentAmount }
            : {}),
          ...(updateLoanDto.durationDays !== undefined
            ? { duration_days: updateLoanDto.durationDays }
            : {}),
          ...(updateLoanDto.startDate !== undefined
            ? { start_date: updateLoanDto.startDate }
            : {}),
          ...(updateLoanDto.gracePeriodDays !== undefined
            ? { grace_period_days: updateLoanDto.gracePeriodDays }
            : {}),
          ...(updateLoanDto.status !== undefined
            ? { status: updateLoanDto.status }
            : {}),
          ...(shouldRecomputeDueDate
            ? {
                due_date: this.computeDueDate(
                  effectiveStartDate,
                  effectiveDurationDays,
                ),
              }
            : {}),
        },
      });

      return this.mapLoanToResponseDto(updatedLoan);
    } catch (error: unknown) {
      this.handleUniqueConstraintError(error);
      this.handleRecordNotFoundError(error, id);
      throw error;
    }
  }

  async delete(id: string, actor: AuthActor): Promise<{ message: string }> {
    if (actor.role === UserRole.CUSTOMER) {
      throw new ForbiddenException('Customers cannot delete loans');
    }

    const loan = await this.getLoanById(id);
    await this.assertLoanAccess(loan, actor);

    const result = await this.prisma.loan.updateMany({
      where: {
        id,
        deleted_at: null,
      },
      data: { deleted_at: new Date() },
    });

    if (result.count === 0) {
      throw new NotFoundException(`Loan with ID ${id} not found`);
    }

    return { message: `Loan ${id} has been deleted` };
  }

  private computeDueDate(startDate: Date, durationDays: number): Date {
    return dayjs(startDate).add(durationDays, 'day').toDate();
  }

  private async getActiveAgentProfileByUserId(
    userId: string,
  ): Promise<{ id: string; user_id: string }> {
    const agent = await this.prisma.agent.findFirst({
      where: {
        user_id: userId,
        deleted_at: null,
      },
      select: {
        id: true,
        user_id: true,
      },
    });

    if (!agent) {
      throw new ForbiddenException('Authenticated user is not an active agent');
    }

    return agent;
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

  private async getActiveCustomerById(
    customerId: string,
  ): Promise<{ id: string; agent_id: string }> {
    const customer = await this.prisma.customer.findFirst({
      where: {
        id: customerId,
        deleted_at: null,
      },
      select: {
        id: true,
        agent_id: true,
      },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${customerId} not found`);
    }

    return customer;
  }

  private async getActiveDeviceById(
    deviceId: string,
  ): Promise<{ id: string; customer_id: string | null }> {
    const device = await this.prisma.device.findFirst({
      where: {
        id: deviceId,
        deleted_at: null,
      },
      select: {
        id: true,
        customer_id: true,
      },
    });

    if (!device) {
      throw new NotFoundException(`Device with ID ${deviceId} not found`);
    }

    return device;
  }

  private async getActiveAgentUserById(
    userId: string,
  ): Promise<{ id: string }> {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        role: UserRole.AGENT,
        status: UserStatus.ACTIVE,
        deleted_at: null,
      },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException(`Agent user with ID ${userId} not found`);
    }

    return user;
  }

  private async resolveLoanAgentUserId(
    actor: AuthActor,
    createLoanDto: CreateLoanDto,
  ): Promise<string> {
    const requestedAgentUserId =
      typeof createLoanDto.agentUserId === 'string'
        ? createLoanDto.agentUserId
        : undefined;

    if (actor.role === UserRole.AGENT) {
      if (requestedAgentUserId && requestedAgentUserId !== actor.id) {
        throw new ForbiddenException(
          'Agents can only create loans for themselves',
        );
      }

      return actor.id;
    }

    if (actor.role === UserRole.ADMIN) {
      if (!requestedAgentUserId) {
        throw new BadRequestException(
          'agentUserId is required when an admin creates a loan',
        );
      }

      return (await this.getActiveAgentUserById(requestedAgentUserId)).id;
    }

    throw new ForbiddenException('Customers cannot create loans');
  }

  private async getLoanById(id: string): Promise<LoanRecord> {
    const loan = await this.prisma.loan.findUnique({ where: { id } });
    if (!loan || loan.deleted_at) {
      throw new NotFoundException(`Loan with ID ${id} not found`);
    }

    return loan;
  }

  private async assertLoanAccess(
    loan: LoanRecord,
    actor: AuthActor,
  ): Promise<void> {
    if (actor.role === UserRole.ADMIN) {
      return;
    }

    if (actor.role === UserRole.AGENT) {
      const agentProfile = await this.getActiveAgentProfileByUserId(actor.id);
      const customer = await this.getActiveCustomerById(loan.customer_id);

      if (customer.agent_id !== agentProfile.id) {
        throw new ForbiddenException(
          'Agents can only access loans for their own customers',
        );
      }

      if (loan.agent_id !== actor.id) {
        throw new ForbiddenException('Agents can only access their own loans');
      }
      return;
    }

    const customer = await this.getActiveCustomerByUserId(actor.id);
    if (loan.customer_id !== customer.id) {
      throw new ForbiddenException('You can only access your own loans');
    }
  }

  private mapLoanToResponseDto(loan: LoanRecord): LoanResponseDto {
    return {
      id: loan.id,
      customerId: loan.customer_id,
      deviceId: loan.device_id,
      agentUserId: loan.agent_id,
      principalAmount: loan.principal_amount.toString(),
      installmentAmount: loan.installment_amount.toString(),
      durationDays: loan.duration_days,
      startDate: loan.start_date,
      dueDate: loan.due_date,
      gracePeriodDays: loan.grace_period_days,
      status: loan.status,
      createdAt: loan.created_at,
      updatedAt: loan.updated_at,
      deletedAt: loan.deleted_at,
    };
  }

  private handleRelatedRecordNotFoundError(error: unknown): void {
    if (isPrismaErrorCode(error, 'P2003')) {
      throw new BadRequestException('Invalid relation reference in loan data');
    }
  }

  private handleRecordNotFoundError(error: unknown, id: string): void {
    if (isPrismaErrorCode(error, 'P2025')) {
      throw new NotFoundException(`Loan with ID ${id} not found`);
    }
  }

  private handleUniqueConstraintError(error: unknown): void {
    if (!isPrismaErrorCode(error, 'P2002')) {
      return;
    }

    const target = getPrismaUniqueConstraintTarget(error);

    if (target.includes('id')) {
      throw new BadRequestException(
        'A loan with this identifier already exists',
      );
    }

    throw new BadRequestException('Unique constraint violation');
  }
}
