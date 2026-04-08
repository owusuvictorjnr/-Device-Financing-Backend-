import { Test, TestingModule } from '@nestjs/testing';
import { PaymentEnforcementWorker } from './payment-enforcement.worker';

describe('PaymentEnforcementWorker', () => {
  let provider: PaymentEnforcementWorker;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PaymentEnforcementWorker],
    }).compile();

    provider = module.get<PaymentEnforcementWorker>(PaymentEnforcementWorker);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });
});
