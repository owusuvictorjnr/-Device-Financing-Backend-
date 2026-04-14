import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles/roles.decorator';
import { JwtGuard } from '../common/guards/jwt/jwt.guard';
import { RolesGuard } from '../common/guards/roles/roles.guard';
import {
  AgentResponseDto,
  CreateAgentDto,
  FindAllAgentsQueryDto,
  UpdateAgentDto,
} from './dto';
import { AgentsService } from './agents.service';

@ApiTags('agents')
@Controller('agents')
@UseGuards(JwtGuard, RolesGuard)
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new agent profile' })
  @Roles(UserRole.ADMIN)
  async create(
    @Body() createAgentDto: CreateAgentDto,
  ): Promise<AgentResponseDto> {
    return this.agentsService.create(createAgentDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all agent profiles' })
  @Roles(UserRole.ADMIN)
  async findAll(
    @Query() query: FindAllAgentsQueryDto,
  ): Promise<AgentResponseDto[]> {
    return this.agentsService.findAll(query.skip, query.take);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an agent profile by ID' })
  @Roles(UserRole.ADMIN)
  async findOne(@Param('id') id: string): Promise<AgentResponseDto> {
    return this.agentsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an agent profile' })
  @Roles(UserRole.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() updateAgentDto: UpdateAgentDto,
  ): Promise<AgentResponseDto> {
    return this.agentsService.update(id, updateAgentDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete an agent profile' })
  @Roles(UserRole.ADMIN)
  async delete(@Param('id') id: string): Promise<{ message: string }> {
    return this.agentsService.delete(id);
  }
}
