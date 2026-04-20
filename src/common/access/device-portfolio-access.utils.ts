import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export async function getActiveAgentByUserId(
  prisma: PrismaService,
  userId: string,
): Promise<{ id: string }> {
  const agent = await prisma.agent.findFirst({
    where: {
      user_id: userId,
      deleted_at: null,
    },
    select: { id: true },
  });

  if (!agent) {
    throw new ForbiddenException('Authenticated user is not an active agent');
  }

  return agent;
}

export async function getActiveCustomerById(
  prisma: PrismaService,
  customerId: string,
): Promise<{ id: string; agent_id: string }> {
  const customer = await prisma.customer.findFirst({
    where: {
      id: customerId,
      deleted_at: null,
    },
    select: {
      id: true,
      agent_id: true,
    },
  });

  if (!customer) {
    throw new NotFoundException(`Customer with ID ${customerId} not found`);
  }

  return customer;
}

export async function assertCustomerBelongsToAgent(
  prisma: PrismaService,
  customerId: string,
  agentId: string,
  errorMessage = 'Agents can only access devices for their customers',
): Promise<void> {
  const customer = await getActiveCustomerById(prisma, customerId);

  if (customer.agent_id !== agentId) {
    throw new ForbiddenException(errorMessage);
  }
}
