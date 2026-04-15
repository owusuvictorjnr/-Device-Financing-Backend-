import {
  PaymentMethod,
  PaymentRecordedBy,
  PaymentStatus,
} from '@prisma/client';

export class PaymentResponseDto {
  id!: string;
  loanId!: string;
  amount!: string;
  paymentMethod!: PaymentMethod;
  reference!: string;
  status!: PaymentStatus;
  paidAt!: Date | null;
  recordedBy!: PaymentRecordedBy;
  recordedByUserId!: string | null;
  createdAt!: Date;
  updatedAt!: Date;
  deletedAt!: Date | null;
}
