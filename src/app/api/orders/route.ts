import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, getCurrentUser, logAudit } from '@/lib/auth';
import { generateOrderNumber } from '@/lib/order-number';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const paymentMethod = searchParams.get('paymentMethod') || '';
    const dateRange = searchParams.get('dateRange') || 'all'; // today, yesterday, 7days, 30days, custom
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (status && status !== 'all') {
      where.orderStatus = status;
    }

    if (paymentMethod && paymentMethod !== 'all') {
      where.paymentMethod = paymentMethod;
    }

    if (search.trim()) {
      where.OR = [
        { orderNumber: { contains: search.trim() } },
        { customerName: { contains: search.trim() } },
      ];
    }

    // Date filters
    const now = new Date();
    if (dateRange === 'today') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      where.createdAt = { gte: start, lte: end };
    } else if (dateRange === 'yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const start = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0);
      const end = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999);
      where.createdAt = { gte: start, lte: end };
    } else if (dateRange === '7days') {
      const past7 = new Date(now);
      past7.setDate(now.getDate() - 7);
      where.createdAt = { gte: past7 };
    } else if (dateRange === '30days') {
      const past30 = new Date(now);
      past30.setDate(now.getDate() - 30);
      where.createdAt = { gte: past30 };
    } else if (dateRange === 'custom' && startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: true,
          cashier: {
            select: { id: true, name: true, username: true },
          },
          payments: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    return NextResponse.json({
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ error: 'ไม่สามารถโหลดรายการออเดอร์ได้' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    let cashierId = user?.id || null;
    const userRole = user?.role || 'CASHIER';

    if (!cashierId) {
      const defaultCashier = await prisma.user.findFirst({
        where: { role: 'CASHIER', status: 'ACTIVE' },
      });
      if (defaultCashier) {
        cashierId = defaultCashier.id;
      } else {
        const anyUser = await prisma.user.findFirst();
        cashierId = anyUser?.id || null;
      }
    }

    const body = await req.json();
    const {
      customerName,
      items,
      discountType = 'NONE',
      discountValue = 0,
      paymentMethod = 'CASH',
      notes,
    } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'ต้องมีสินค้าอย่างน้อย 1 รายการในคำสั่งซื้อ' }, { status: 400 });
    }

    const setting = await prisma.storeSetting.findUnique({ where: { id: 'default' } });
    const orderPrefix = setting?.orderPrefix || 'NN';
    const maxCashierDiscountPct = setting?.maxCashierDiscountPct || 10;

    // Validate items and calculate subtotal
    let subtotal = 0;
    const validatedItems: {
      productId: string;
      variantId?: string;
      productName: string;
      variantName?: string;
      price: number;
      cost: number;
      quantity: number;
      itemSubtotal: number;
    }[] = [];

    for (const item of items) {
      if (!item.productId || !item.quantity || item.quantity <= 0) {
        return NextResponse.json({ error: 'ข้อมูลสินค้าในตะกร้าไม่ถูกต้อง' }, { status: 400 });
      }

      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        include: { variants: true },
      });

      if (!product || product.deletedAt || product.status !== 'ACTIVE') {
        return NextResponse.json({ error: `สินค้า ${item.productName || ''} ไม่พร้อมจำหน่าย` }, { status: 400 });
      }

      let price = product.sellingPrice;
      let cost = product.costPrice;
      let variantName: string | undefined;

      if (item.variantId) {
        const variant = product.variants.find((v) => v.id === item.variantId);
        if (!variant || variant.status !== 'ACTIVE') {
          return NextResponse.json({ error: `ตัวเลือกสินค้า ${variant?.name || ''} ไม่พร้อมจำหน่าย` }, { status: 400 });
        }
        if (variant.stock < item.quantity) {
          return NextResponse.json(
            { error: `สต็อก ${product.name} (${variant.name}) มีเพียง ${variant.stock} ชิ้น ไม่พอจำหน่าย` },
            { status: 400 }
          );
        }
        price = variant.price;
        cost = variant.costPrice ?? product.costPrice;
        variantName = variant.name;
      } else {
        if (product.stock < item.quantity) {
          return NextResponse.json(
            { error: `สต็อก ${product.name} มีเพียง ${product.stock} ชิ้น ไม่พอจำหน่าย` },
            { status: 400 }
          );
        }
      }

      const itemSubtotal = price * item.quantity;
      subtotal += itemSubtotal;

      validatedItems.push({
        productId: product.id,
        variantId: item.variantId,
        productName: product.name,
        variantName,
        price,
        cost,
        quantity: item.quantity,
        itemSubtotal,
      });
    }

    // Calculate discount
    let discountAmount = 0;
    const numDiscountValue = parseFloat(discountValue) || 0;

    if (discountType === 'PERCENTAGE') {
      // Cashier check
      if (userRole === 'CASHIER' && numDiscountValue > maxCashierDiscountPct) {
        return NextResponse.json(
          { error: `แคชเชียร์สามารถให้ส่วนลดได้ไม่เกิน ${maxCashierDiscountPct}%` },
          { status: 403 }
        );
      }
      discountAmount = (subtotal * numDiscountValue) / 100;
    } else if (discountType === 'FIXED') {
      const maxAllowedFixed = (subtotal * maxCashierDiscountPct) / 100;
      if (userRole === 'CASHIER' && numDiscountValue > maxAllowedFixed) {
        return NextResponse.json(
          { error: `แคชเชียร์สามารถให้ส่วนลดได้ไม่เกิน ฿${maxAllowedFixed.toFixed(2)} (${maxCashierDiscountPct}%)` },
          { status: 403 }
        );
      }
      discountAmount = Math.min(subtotal, numDiscountValue);
    }

    const total = Math.max(0, subtotal - discountAmount);
    const orderNumber = await generateOrderNumber(orderPrefix);

    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerName: customerName?.trim() || 'ลูกค้าหน้าร้าน',
        subtotal,
        discountType,
        discountValue: numDiscountValue,
        discountAmount,
        total,
        paymentMethod,
        paymentStatus: 'PENDING',
        orderStatus: 'PENDING',
        cashierId,
        notes: notes?.trim() || null,
        items: {
          create: validatedItems.map((vi) => ({
            productId: vi.productId,
            variantId: vi.variantId,
            productNameSnapshot: vi.productName,
            variantNameSnapshot: vi.variantName,
            priceSnapshot: vi.price,
            costSnapshot: vi.cost,
            quantity: vi.quantity,
            subtotal: vi.itemSubtotal,
          })),
        },
      },
      include: {
        items: true,
        cashier: {
          select: { id: true, name: true, username: true },
        },
      },
    });

    if (cashierId) {
      await logAudit({
        userId: cashierId,
        userName: user?.name || 'หน้าร้าน (POS)',
        action: 'CREATE_ORDER',
        entityType: 'ORDER',
        entityId: order.id,
        details: `Created order ${order.orderNumber} (฿${order.total})`,
      });
    }

    return NextResponse.json({ success: true, order }, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating order:', error);
    const msg = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการสร้างคำสั่งซื้อ';
    if (msg === 'UNAUTHORIZED' || msg === 'FORBIDDEN') {
      return NextResponse.json({ error: 'คุณไม่มีสิทธิ์ทำรายการนี้' }, { status: 403 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
