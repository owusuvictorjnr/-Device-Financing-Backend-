import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateCustomerDto {
  @IsUUID()
  userId: string;

  @IsOptional()
  @IsUUID()
  @ApiPropertyOptional({
    description:
      'Required for ADMIN requests. For AGENT requests, omit this field or provide the authenticated agent ID; mismatched values are rejected.',
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
