import 'dotenv/config';
import { Prisma, PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';
import dayjs from 'dayjs';
import { createPrismaClientOptions } from '../src/database/prisma-client-options';

const prisma = new PrismaClient(createPrismaClientOptions());
const SEED_LOAN_ID = '00000000-0000-0000-0000-000000000001';
const SEED_COMMAND_ID = '00000000-0000-0000-0000-000000000002';

function assertSeedExecutionAllowed(): void {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Seeding is blocked when NODE_ENV=production.');
  }

  if (process.env.ALLOW_SEED !== 'true') {
    throw new Error('Set ALLOW_SEED=true to run the seed script.');
  }
}

function getSeedInitialPassword(): string {
  const password = process.env.SEED_INITIAL_PASSWORD?.trim();

  if (!password) {
    throw new Error('SEED_INITIAL_PASSWORD is required for seeding.');
  }

  return password;
}

function shouldResetSeedPasswords(): boolean {
  return process.env.SEED_RESET_PASSWORDS === 'true';
}

async function main(): Promise<void> {
  assertSeedExecutionAllowed();

  const passwordHash = await hash(getSeedInitialPassword(), 10);
  const resetPasswords = shouldResetSeedPasswords();

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@device-finance.local' },
    update: {
      name: 'System Administrator',
      phone: '+233200000001',
      ...(resetPasswords ? { password_hash: passwordHash } : {}),
      role: 'ADMIN',
      status: 'ACTIVE',
    },
    create: {
      name: 'System Administrator',
      phone: '+233200000001',
      email: 'admin@device-finance.local',
      password_hash: passwordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  const agentUser = await prisma.user.upsert({
    where: { email: 'agent@device-finance.local' },
    update: {
      name: 'Field Agent',
      phone: '+233200000002',
      ...(resetPasswords ? { password_hash: passwordHash } : {}),
      role: 'AGENT',
      status: 'ACTIVE',
    },
    create: {
      name: 'Field Agent',
      phone: '+233200000002',
      email: 'agent@device-finance.local',
      password_hash: passwordHash,
      role: 'AGENT',
      status: 'ACTIVE',
    },
  });

  const agent = await prisma.agent.upsert({
    where: { user_id: agentUser.id },
    update: {
      region: 'Greater Accra',
      commission_rate: 5.5,
      deleted_at: null,
    },
    create: {
      user_id: agentUser.id,
      region: 'Greater Accra',
      commission_rate: 5.5,
    },
  });

  const customerUser = await prisma.user.upsert({
    where: { email: 'customer@device-finance.local' },
    update: {
      name: 'Sample Customer',
      phone: '+233200000003',
      ...(resetPasswords ? { password_hash: passwordHash } : {}),
      role: 'CUSTOMER',
      status: 'ACTIVE',
    },
    create: {
      name: 'Sample Customer',
      phone: '+233200000003',
      email: 'customer@device-finance.local',
      password_hash: passwordHash,
      role: 'CUSTOMER',
      status: 'ACTIVE',
    },
  });

  const customer = await prisma.customer.upsert({
    where: { user_id: customerUser.id },
    update: {
      agent_id: agent.id,
      national_id: 'GHA-000000001',
      address: 'Accra, Ghana',
      deleted_at: null,
    },
    create: {
      user_id: customerUser.id,
      agent_id: agent.id,
      national_id: 'GHA-000000001',
      address: 'Accra, Ghana',
    },
  });

  const device = await prisma.device.upsert({
    where: { serial_number: 'DEV-ANDROID-0001' },
    update: {
      customer_id: customer.id,
      status: 'ACTIVE',
      deleted_at: null,
      last_seen: dayjs().toDate(),
    },
    create: {
      serial_number: 'DEV-ANDROID-0001',
      device_type: 'ANDROID_PHONE',
      platform: 'ANDROID',
      model: 'Pixel Finance Edition',
      status: 'ACTIVE',
      customer_id: customer.id,
      last_seen: dayjs().toDate(),
    },
  });

  const today = dayjs();
  const dueDate = today.add(90, 'day').toDate();

  const loan = await prisma.loan.upsert({
    where: { id: SEED_LOAN_ID },
    update: {
      customer_id: customer.id,
      device_id: device.id,
      agent_id: agentUser.id,
      principal_amount: new Prisma.Decimal('1200.00'),
      installment_amount: new Prisma.Decimal('13.34'),
      duration_days: 90,
      start_date: today.toDate(),
      due_date: dueDate,
      grace_period_days: 5,
      status: 'ACTIVE',
      deleted_at: null,
    },
    create: {
      id: SEED_LOAN_ID,
      customer_id: customer.id,
      device_id: device.id,
      agent_id: agentUser.id,
      principal_amount: new Prisma.Decimal('1200.00'),
      installment_amount: new Prisma.Decimal('13.34'),
      duration_days: 90,
      start_date: today.toDate(),
      due_date: dueDate,
      grace_period_days: 5,
      status: 'ACTIVE',
    },
  });

  await prisma.payment.upsert({
    where: { reference: 'SEED-PMT-0001' },
    update: {
      loan_id: loan.id,
      amount: new Prisma.Decimal('13.34'),
      payment_method: 'MOBILE_MONEY',
      status: 'COMPLETED',
      paid_at: today.toDate(),
      recorded_by: 'AGENT',
      recorded_by_id: agentUser.id,
      deleted_at: null,
    },
    create: {
      loan_id: loan.id,
      amount: new Prisma.Decimal('13.34'),
      payment_method: 'MOBILE_MONEY',
      reference: 'SEED-PMT-0001',
      status: 'COMPLETED',
      paid_at: today.toDate(),
      recorded_by: 'AGENT',
      recorded_by_id: agentUser.id,
    },
  });

  await prisma.command.upsert({
    where: { id: SEED_COMMAND_ID },
    update: {
      device_id: device.id,
      loan_id: loan.id,
      command_type: 'SYNC',
      status: 'ACKNOWLEDGED',
      sent_at: today.toDate(),
      acknowledged_at: today.toDate(),
      retry_count: 0,
      issued_by_id: adminUser.id,
      deleted_at: null,
    },
    create: {
      id: SEED_COMMAND_ID,
      device_id: device.id,
      loan_id: loan.id,
      command_type: 'SYNC',
      status: 'ACKNOWLEDGED',
      sent_at: today.toDate(),
      acknowledged_at: today.toDate(),
      retry_count: 0,
      issued_by_id: adminUser.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      user_id: adminUser.id,
      action: 'seed.executed',
      entity: 'system',
      entity_id: 'seed-script',
      changes: {
        users: [adminUser.email, agentUser.email, customerUser.email],
        note: 'Initial seed data ensured',
      },
      ip_address: '127.0.0.1',
    },
  });

  // eslint-disable-next-line no-console
  console.log('Seed completed successfully.');
}

main()
  .catch((error: unknown) => {
    // eslint-disable-next-line no-console
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
