import prisma from '@/lib/prisma';

export async function generateOrderNumber(prefix = 'NN'): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  const todayStart = new Date(year, now.getMonth(), now.getDate(), 0, 0, 0);
  const todayEnd = new Date(year, now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const countToday = await prisma.order.count({
    where: {
      createdAt: {
        gte: todayStart,
        lte: todayEnd,
      },
    },
  });

  const sequence = String(countToday + 1).padStart(4, '0');
  return `${prefix}-${dateStr}-${sequence}`;
}
