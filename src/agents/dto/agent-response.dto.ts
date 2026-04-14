export class AgentResponseDto {
  id: string;
  userId: string;
  region: string;
  commissionRate: number;
  customerCount: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
