import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    await requireAuth(['ADMIN', 'MANAGER']);
    const { searchParams } = new URL(req.url);
    const range = searchParams.get('range') || '7days';
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    const now = new Date();
    let startDate = new Date();
    let endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (range === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    } else if (range === '7days') {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
    } else if (range === '30days') {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 29);
      startDate.setHours(0, 0, 0, 0);
    } else if (range === 'thisMonth') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    } else if (range === 'lastMonth') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    } else if (range === 'custom' && startDateParam && endDateParam) {
      startDate = new Date(startDateParam);
      endDate = new Date(endDateParam);
      endDate.setHours(23, 59, 59, 999);
    }

    // 1. Fetch orders in range (PAID or COMPLETED)
    const paidOrders = await prisma.order.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        paymentStatus: 'PAID',
      },
      include: {
        items: true,
        payments: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // 2. Fetch today's orders specifically for today's summary card
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const todayOrders = await prisma.order.findMany({
      where: {
        createdAt: { gte: todayStart, lte: todayEnd },
        paymentStatus: 'PAID',
      },
      include: { items: true },
    });

    const todaySales = todayOrders.reduce((sum, o) => sum + o.total, 0);
    const todayOrdersCount = todayOrders.length;
    const todayItemsSold = todayOrders.reduce(
      (sum, o) => sum + o.items.reduce((iSum, item) => iSum + item.quantity, 0),
      0
    );
    const todayAverageOrder = todayOrdersCount > 0 ? todaySales / todayOrdersCount : 0;

    // Period totals
    const periodRevenue = paidOrders.reduce((sum, o) => sum + o.total, 0);
    const periodOrdersCount = paidOrders.length;
    let periodTotalCost = 0;
    let periodItemsSold = 0;

    // 3. Aggregate Top Selling Products & Costs
    const productStatsMap: Record<
      string,
      { name: string; quantity: number; revenue: number; cost: number }
    > = {};

    for (const order of paidOrders) {
      for (const item of order.items) {
        periodItemsSold += item.quantity;
        const itemCost = item.costSnapshot * item.quantity;
        periodTotalCost += itemCost;

        const key = item.productId || item.productNameSnapshot;
        if (!productStatsMap[key]) {
          productStatsMap[key] = {
            name: item.productNameSnapshot,
            quantity: 0,
            revenue: 0,
            cost: 0,
          };
        }
        productStatsMap[key].quantity += item.quantity;
        productStatsMap[key].revenue += item.subtotal;
        productStatsMap[key].cost += itemCost;
      }
    }

    const topProducts = Object.values(productStatsMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    const grossProfit = periodRevenue - periodTotalCost;

    // 4. Payment breakdown
    const paymentBreakdown = {
      CASH: { count: 0, amount: 0 },
      QR_PROMPTPAY: { count: 0, amount: 0 },
      OTHER: { count: 0, amount: 0 },
    };

    for (const order of paidOrders) {
      const method = (order.paymentMethod in paymentBreakdown
        ? order.paymentMethod
        : 'OTHER') as keyof typeof paymentBreakdown;
      paymentBreakdown[method].count += 1;
      paymentBreakdown[method].amount += order.total;
    }

    // 5. Chart data: Group by day
    const chartMap: Record<string, { date: string; displayDate: string; revenue: number; orders: number }> = {};

    // Initialize all dates in range
    const curr = new Date(startDate);
    while (curr <= endDate) {
      const key = curr.toISOString().slice(0, 10);
      const displayDate = curr.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
      chartMap[key] = { date: key, displayDate, revenue: 0, orders: 0 };
      curr.setDate(curr.getDate() + 1);
    }

    for (const order of paidOrders) {
      const key = order.createdAt.toISOString().slice(0, 10);
      if (chartMap[key]) {
        chartMap[key].revenue += order.total;
        chartMap[key].orders += 1;
      }
    }

    const chartData = Object.values(chartMap).sort((a, b) => a.date.localeCompare(b.date));

    // 6. Low stock items
    const allActiveProducts = await prisma.product.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        stock: true,
        lowStockThreshold: true,
        image: true,
      },
      orderBy: { stock: 'asc' },
    });

    const lowStockProducts = allActiveProducts
      .filter((p) => p.stock <= p.lowStockThreshold)
      .slice(0, 5);

    // 7. Recent orders
    const recentOrders = await prisma.order.findMany({
      take: 6,
      orderBy: { createdAt: 'desc' },
      include: {
        items: true,
        cashier: { select: { name: true } },
      },
    });

    return NextResponse.json({
      today: {
        sales: todaySales,
        orders: todayOrdersCount,
        itemsSold: todayItemsSold,
        averageOrder: todayAverageOrder,
      },
      period: {
        revenue: periodRevenue,
        ordersCount: periodOrdersCount,
        itemsSold: periodItemsSold,
        totalCost: periodTotalCost,
        grossProfit,
        profitMargin: periodRevenue > 0 ? (grossProfit / periodRevenue) * 100 : 0,
      },
      chartData,
      topProducts,
      paymentBreakdown,
      lowStockProducts,
      recentOrders,
    });
  } catch (error: unknown) {
    console.error('Error generating reports:', error);
    const msg = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการดึงข้อมูลรายงาน';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
