export class CustomerResponseDto {
  id: string;
  userId: string;
  agentId: string;
  nationalId: string;
  address: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}