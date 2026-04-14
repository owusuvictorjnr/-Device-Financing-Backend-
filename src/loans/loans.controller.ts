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
  CreateLoanDto,
  FindAllLoansQueryDto,
  LoanResponseDto,
  UpdateLoanDto,
} from './dto';
import { LoansService } from './loans.service';

type AuthActor = {
  id: string;
  role: UserRole;
};

type LoansServiceContract = {
  create(
    createLoanDto: CreateLoanDto,
    actor: AuthActor,
  ): Promise<LoanResponseDto>;
  findAll(
    query: FindAllLoansQueryDto,
    actor: AuthActor,
  ): Promise<LoanResponseDto[]>;
  findOne(id: string, actor: AuthActor): Promise<LoanResponseDto>;
  update(
    id: string,
    updateLoanDto: UpdateLoanDto,
    actor: AuthActor,
  ): Promise<LoanResponseDto>;
  delete(id: string, actor: AuthActor): Promise<{ message: string }>;
};

@ApiTags('loans')
@Controller('loans')
@UseGuards(JwtGuard, RolesGuard)
export class LoansController {
  private readonly loansService: LoansServiceContract;

  constructor(loansService: LoansService) {
    this.loansService = loansService as unknown as LoansServiceContract;
  }

  @Post()
  @ApiOperation({ summary: 'Create a new loan' })
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  async create(
    @Body() createLoanDto: CreateLoanDto,
    @CurrentUser('id') currentUserId: string,
    @CurrentUser('role') currentUserRole: UserRole,
  ): Promise<LoanResponseDto> {
    const result = await this.loansService.create(
      createLoanDto,
      this.getActor(currentUserId, currentUserRole),
    );

    return result;
  }

  @Get()
  @ApiOperation({ summary: 'Get loans' })
  @Roles(UserRole.ADMIN, UserRole.AGENT, UserRole.CUSTOMER)
  async findAll(
    @Query() query: FindAllLoansQueryDto,
    @CurrentUser('id') currentUserId: string,
    @CurrentUser('role') currentUserRole: UserRole,
  ): Promise<LoanResponseDto[]> {
    const result = await this.loansService.findAll(
      query,
      this.getActor(currentUserId, currentUserRole),
    );

    return result;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a loan by ID' })
  @Roles(UserRole.ADMIN, UserRole.AGENT, UserRole.CUSTOMER)
  async findOne(
    @Param('id') id: string,
    @CurrentUser('id') currentUserId: string,
    @CurrentUser('role') currentUserRole: UserRole,
  ): Promise<LoanResponseDto> {
    const result = await this.loansService.findOne(
      id,
      this.getActor(currentUserId, currentUserRole),
    );

    return result;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a loan' })
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  async update(
    @Param('id') id: string,
    @Body() updateLoanDto: UpdateLoanDto,
    @CurrentUser('id') currentUserId: string,
    @CurrentUser('role') currentUserRole: UserRole,
  ): Promise<LoanResponseDto> {
    const result = await this.loansService.update(
      id,
      updateLoanDto,
      this.getActor(currentUserId, currentUserRole),
    );

    return result;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete a loan' })
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  async delete(
    @Param('id') id: string,
    @CurrentUser('id') currentUserId: string,
    @CurrentUser('role') currentUserRole: UserRole,
  ): Promise<{ message: string }> {
    const result = await this.loansService.delete(
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
