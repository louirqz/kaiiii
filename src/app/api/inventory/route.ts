import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    await requireAuth(['ADMIN', 'MANAGER']);
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter') || 'all'; // all, low_stock, out_of_stock
    const search = searchParams.get('search') || '';

    const products = await prisma.product.findMany({
      where: {
        deletedAt: null,
        ...(search.trim()
          ? {
              OR: [
                { name: { contains: search.trim() } },
                { sku: { contains: search.trim() } },
              ],
            }
          : {}),
      },
      include: {
        category: {
          select: { name: true, icon: true },
        },
        variants: true,
      },
      orderBy: { stock: 'asc' },
    });

    const inventoryItems = products.map((p) => {
      let status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' = 'IN_STOCK';
      if (p.stock <= 0) {
        status = 'OUT_OF_STOCK';
      } else if (p.stock <= p.lowStockThreshold) {
        status = 'LOW_STOCK';
      }

      return {
        id: p.id,
        name: p.name,
        image: p.image,
        category: p.category.name,
        categoryIcon: p.category.icon,
        sku: p.sku,
        barcode: p.barcode,
        costPrice: p.costPrice,
        sellingPrice: p.sellingPrice,
        stock: p.stock,
        lowStockThreshold: p.lowStockThreshold,
        status,
        hasVariants: p.variants.length > 0,
        variants: p.variants.map((v) => {
          let vStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' = 'IN_STOCK';
          if (v.stock <= 0) vStatus = 'OUT_OF_STOCK';
          else if (v.stock <= p.lowStockThreshold) vStatus = 'LOW_STOCK';
          return {
            id: v.id,
            name: v.name,
            sku: v.sku,
            price: v.price,
            stock: v.stock,
            status: vStatus,
          };
        }),
      };
    });

    const filtered = inventoryItems.filter((item) => {
      if (filter === 'low_stock') return item.status === 'LOW_STOCK';
      if (filter === 'out_of_stock') return item.status === 'OUT_OF_STOCK';
      return true;
    });

    const lowStockCount = inventoryItems.filter((i) => i.status === 'LOW_STOCK').length;
    const outOfStockCount = inventoryItems.filter((i) => i.status === 'OUT_OF_STOCK').length;

    return NextResponse.json({
      items: filtered,
      stats: {
        totalProducts: inventoryItems.length,
        lowStockCount,
        outOfStockCount,
      },
    });
  } catch (error: unknown) {
    console.error('Error fetching inventory:', error);
    const msg = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการโหลดข้อมูลสต็อก';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
