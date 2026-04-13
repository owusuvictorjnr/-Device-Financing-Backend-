import { IsNotEmpty, IsNumber, IsString, IsUUID, Min } from 'class-validator';

export class CreateAgentDto {
  @IsUUID()
  userId: string;

  @IsString()
  @IsNotEmpty()
  region: string;

  @IsNumber()
  @Min(0)
  commissionRate: number;
}