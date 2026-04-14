import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateCustomerDto {
  @IsUUID()
  userId: string;

  @IsOptional()
  @IsUUID()
  @ApiPropertyOptional({
    description:
      'Required for ADMIN requests. Ignored for AGENT requests, where the authenticated agent is used automatically.',
    format: 'uuid',
  })
  agentId?: string;

  @IsString()
  @IsNotEmpty()
  nationalId: string;

  @IsString()
  @IsNotEmpty()
  address: string;
}
