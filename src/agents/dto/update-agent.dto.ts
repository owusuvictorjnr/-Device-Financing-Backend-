import { IsNumber, IsString, IsUUID, Min, ValidateIf } from 'class-validator';

export class UpdateAgentDto {
  @ValidateIf((_, value) => value !== undefined)
  @IsUUID()
  userId?: string;

  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  region?: string;

  @ValidateIf((_, value) => value !== undefined)
  @IsNumber()
  @Min(0)
  commissionRate?: number;
}
