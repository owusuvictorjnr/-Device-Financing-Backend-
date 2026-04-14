import { IsString, IsUUID, ValidateIf } from 'class-validator';

export class UpdateCustomerDto {
  @ValidateIf((_, value) => value !== undefined)
  @IsUUID()
  userId?: string;

  @ValidateIf((_, value) => value !== undefined)
  @IsUUID()
  agentId?: string;

  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  nationalId?: string;

  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  address?: string;
}
