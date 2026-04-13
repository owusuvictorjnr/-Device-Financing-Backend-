import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateCustomerDto {
  @IsUUID()
  userId: string;

  @IsOptional()
  @IsUUID()
  agentId?: string;

  @IsString()
  @IsNotEmpty()
  nationalId: string;

  @IsString()
  @IsNotEmpty()
  address: string;
}