import {
	BadRequestException,
	ForbiddenException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import {
	CreateCustomerDto,
	CustomerResponseDto,
	FindAllCustomersQueryDto,
	UpdateCustomerDto,
} from './dto';

type AuthActor = {
	id: string;
	role: UserRole;
};

type CustomerRecord = {
	id: string;
	user_id: string;
	agent_id: string;
	national_id: string;
	address: string;
	created_at: Date;
	updated_at: Date;
	deleted_at: Date | null;
};

@Injectable()
export class CustomersService {
	constructor(private readonly prisma: PrismaService) {}

	async create(
		createCustomerDto: CreateCustomerDto,
		actor: AuthActor,
	): Promise<CustomerResponseDto> {
		const agentId = await this.resolveTargetAgentId(actor, createCustomerDto.agentId);
		await this.assertValidCustomerUser(createCustomerDto.userId);
		await this.assertAgentExists(agentId);

		try {
			const customer = await this.prisma.customer.create({
				data: {
					user_id: createCustomerDto.userId,
					agent_id: agentId,
					national_id: createCustomerDto.nationalId,
					address: createCustomerDto.address,
				},
			});

			return this.mapCustomerToResponseDto(customer);
		} catch (error: unknown) {
			this.handleUniqueConstraintError(error);
			this.handleRelatedRecordNotFoundError(error);
			throw error;
		}
	}

	async findAll(
		query: FindAllCustomersQueryDto,
		actor: AuthActor,
	): Promise<CustomerResponseDto[]> {
		const where: {
			deleted_at: null;
			agent_id?: string;
		} = {
			deleted_at: null,
		};

		if (actor.role === UserRole.AGENT) {
			const agent = await this.getActiveAgentByUserId(actor.id);
			where.agent_id = agent.id;
		} else if (query.agentId) {
			where.agent_id = query.agentId;
		}

		const customers = await this.prisma.customer.findMany({
			where,
			skip: query.skip,
			take: query.take,
			orderBy: { created_at: 'desc' },
		});

		return customers.map((customer) => this.mapCustomerToResponseDto(customer));
	}

	async findOne(id: string, actor: AuthActor): Promise<CustomerResponseDto> {
		const customer = await this.getCustomerById(id);
		await this.assertCustomerAccess(customer, actor);

		return this.mapCustomerToResponseDto(customer);
	}

	async update(
		id: string,
		updateCustomerDto: UpdateCustomerDto,
		actor: AuthActor,
	): Promise<CustomerResponseDto> {
		const customer = await this.getCustomerById(id);
		await this.assertCustomerAccess(customer, actor);

		if (updateCustomerDto.userId) {
			await this.assertValidCustomerUser(updateCustomerDto.userId);

			const existingCustomerForUser = await this.prisma.customer.findUnique({
				where: { user_id: updateCustomerDto.userId },
			});

			if (existingCustomerForUser && existingCustomerForUser.id !== id) {
				throw new BadRequestException('User already has a customer profile');
			}
		}

		let targetAgentId: string | undefined;
		if (updateCustomerDto.agentId !== undefined) {
			targetAgentId = await this.resolveTargetAgentId(actor, updateCustomerDto.agentId);
			await this.assertAgentExists(targetAgentId);
		}

		try {
			const updatedCustomer = await this.prisma.customer.update({
				where: { id },
				data: {
					...(updateCustomerDto.userId
						? { user_id: updateCustomerDto.userId }
						: {}),
					...(targetAgentId ? { agent_id: targetAgentId } : {}),
					...(updateCustomerDto.nationalId
						? { national_id: updateCustomerDto.nationalId }
						: {}),
					...(updateCustomerDto.address
						? { address: updateCustomerDto.address }
						: {}),
				},
			});

			return this.mapCustomerToResponseDto(updatedCustomer);
		} catch (error: unknown) {
			this.handleUniqueConstraintError(error);
			this.handleRecordNotFoundError(error, id);
			this.handleRelatedRecordNotFoundError(error);
			throw error;
		}
	}

	async delete(id: string, actor: AuthActor): Promise<{ message: string }> {
		const customer = await this.getCustomerById(id);
		await this.assertCustomerAccess(customer, actor);

		await this.prisma.customer.update({
			where: { id },
			data: { deleted_at: new Date() },
		});

		return { message: `Customer ${id} has been deleted` };
	}

	private async getCustomerById(id: string): Promise<CustomerRecord> {
		const customer = await this.prisma.customer.findUnique({ where: { id } });

		if (!customer || customer.deleted_at) {
			throw new NotFoundException(`Customer with ID ${id} not found`);
		}

		return customer;
	}

	private async getActiveAgentByUserId(userId: string): Promise<{ id: string }> {
		const agent = await this.prisma.agent.findFirst({
			where: {
				user_id: userId,
				deleted_at: null,
			},
			select: { id: true },
		});

		if (!agent) {
			throw new ForbiddenException('Authenticated user is not an active agent');
		}

		return agent;
	}

	private async resolveTargetAgentId(
		actor: AuthActor,
		requestedAgentId: string | undefined,
	): Promise<string> {
		if (actor.role === UserRole.AGENT) {
			const agent = await this.getActiveAgentByUserId(actor.id);

			if (requestedAgentId && requestedAgentId !== agent.id) {
				throw new ForbiddenException('Agents can only assign customers to themselves');
			}

			return agent.id;
		}

		if (!requestedAgentId) {
			throw new BadRequestException('agentId is required');
		}

		return requestedAgentId;
	}

	private async assertCustomerAccess(
		customer: CustomerRecord,
		actor: AuthActor,
	): Promise<void> {
		if (actor.role === UserRole.ADMIN) {
			return;
		}

		const agent = await this.getActiveAgentByUserId(actor.id);

		if (customer.agent_id !== agent.id) {
			throw new ForbiddenException('You can only access your assigned customers');
		}
	}

	private async assertValidCustomerUser(userId: string): Promise<void> {
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
		});

		if (!user || user.deleted_at) {
			throw new NotFoundException(`User with ID ${userId} not found`);
		}

		if (user.role !== UserRole.CUSTOMER) {
			throw new BadRequestException('User must have CUSTOMER role');
		}
	}

	private async assertAgentExists(agentId: string): Promise<void> {
		const agent = await this.prisma.agent.findUnique({
			where: { id: agentId },
		});

		if (!agent || agent.deleted_at) {
			throw new NotFoundException(`Agent with ID ${agentId} not found`);
		}
	}

	private mapCustomerToResponseDto(customer: CustomerRecord): CustomerResponseDto {
		return {
			id: customer.id,
			userId: customer.user_id,
			agentId: customer.agent_id,
			nationalId: customer.national_id,
			address: customer.address,
			createdAt: customer.created_at,
			updatedAt: customer.updated_at,
			deletedAt: customer.deleted_at,
		};
	}

	private handleUniqueConstraintError(error: unknown): void {
		if (!this.isPrismaError(error, 'P2002')) {
			return;
		}

		const target = this.getUniqueConstraintTarget(error);

		if (target.includes('user_id')) {
			throw new BadRequestException('User already has a customer profile');
		}

		if (target.includes('national_id')) {
			throw new BadRequestException('National ID already in use');
		}

		throw new BadRequestException(
			'Customer with provided details already exists',
		);
	}

	private handleRecordNotFoundError(error: unknown, id: string): void {
		if (!this.isPrismaError(error, 'P2025')) {
			return;
		}

		throw new NotFoundException(`Customer with ID ${id} not found`);
	}

	private handleRelatedRecordNotFoundError(error: unknown): void {
		if (!this.isPrismaError(error, 'P2003')) {
			return;
		}

		throw new BadRequestException('Referenced user or agent does not exist');
	}

	private isPrismaError(error: unknown, code: string): boolean {
		if (!error || typeof error !== 'object') {
			return false;
		}

		return (error as { code?: unknown }).code === code;
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
