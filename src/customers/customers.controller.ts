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
	CreateCustomerDto,
	CustomerResponseDto,
	FindAllCustomersQueryDto,
	UpdateCustomerDto,
} from './dto';
import { CustomersService } from './customers.service';

type AuthActor = {
	id: string;
	role: UserRole;
};

@ApiTags('customers')
@Controller('customers')
@UseGuards(JwtGuard, RolesGuard)
export class CustomersController {
	constructor(private readonly customersService: CustomersService) {}

	@Post()
	@ApiOperation({ summary: 'Create a new customer profile' })
	@Roles(UserRole.ADMIN, UserRole.AGENT)
	async create(
		@Body() createCustomerDto: CreateCustomerDto,
		@CurrentUser('id') currentUserId: string,
		@CurrentUser('role') currentUserRole: UserRole,
	): Promise<CustomerResponseDto> {
		return this.customersService.create(
			createCustomerDto,
			this.getActor(currentUserId, currentUserRole),
		);
	}

	@Get()
	@ApiOperation({ summary: 'Get customer profiles' })
	@Roles(UserRole.ADMIN, UserRole.AGENT)
	async findAll(
		@Query() query: FindAllCustomersQueryDto,
		@CurrentUser('id') currentUserId: string,
		@CurrentUser('role') currentUserRole: UserRole,
	): Promise<CustomerResponseDto[]> {
		return this.customersService.findAll(
			query,
			this.getActor(currentUserId, currentUserRole),
		);
	}

	@Get(':id')
	@ApiOperation({ summary: 'Get a customer profile by ID' })
	@Roles(UserRole.ADMIN, UserRole.AGENT)
	async findOne(
		@Param('id') id: string,
		@CurrentUser('id') currentUserId: string,
		@CurrentUser('role') currentUserRole: UserRole,
	): Promise<CustomerResponseDto> {
		return this.customersService.findOne(
			id,
			this.getActor(currentUserId, currentUserRole),
		);
	}

	@Patch(':id')
	@ApiOperation({ summary: 'Update a customer profile' })
	@Roles(UserRole.ADMIN, UserRole.AGENT)
	async update(
		@Param('id') id: string,
		@Body() updateCustomerDto: UpdateCustomerDto,
		@CurrentUser('id') currentUserId: string,
		@CurrentUser('role') currentUserRole: UserRole,
	): Promise<CustomerResponseDto> {
		return this.customersService.update(
			id,
			updateCustomerDto,
			this.getActor(currentUserId, currentUserRole),
		);
	}

	@Delete(':id')
	@ApiOperation({ summary: 'Soft-delete a customer profile' })
	@Roles(UserRole.ADMIN, UserRole.AGENT)
	async delete(
		@Param('id') id: string,
		@CurrentUser('id') currentUserId: string,
		@CurrentUser('role') currentUserRole: UserRole,
	): Promise<{ message: string }> {
		return this.customersService.delete(
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
