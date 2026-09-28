import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { requireAuth, logAudit } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const categoryId = searchParams.get('category') || '';
    const status = searchParams.get('status') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      deletedAt: null, // Only non-deleted items
    };

    if (categoryId && categoryId !== 'all') {
      where.categoryId = categoryId;
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    if (search.trim()) {
      where.OR = [
        { name: { contains: search.trim() } },
        { sku: { contains: search.trim() } },
        { barcode: { contains: search.trim() } },
        { description: { contains: search.trim() } },
      ];
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: {
            select: { id: true, name: true, icon: true, slug: true },
          },
          variants: {
            where: { status: 'ACTIVE' },
          },
        },
        orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    return NextResponse.json({
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'ไม่สามารถโหลดข้อมูลสินค้าได้' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(['ADMIN', 'MANAGER']);
    const body = await req.json();

    const {
      name,
      description,
      image,
      categoryId,
      sku,
      barcode,
      costPrice,
      sellingPrice,
      stock,
      lowStockThreshold,
      status,
      variants,
    } = body;

    if (!name || !categoryId || sellingPrice === undefined) {
      return NextResponse.json(
        { error: 'กรุณากรอกชื่อสินค้า, หมวดหมู่, และราคาขายให้ครบถ้วน' },
        { status: 400 }
      );
    }

    // Check SKU or Barcode uniqueness if provided
    if (sku) {
      const existingSku = await prisma.product.findFirst({
        where: { sku, deletedAt: null },
      });
      if (existingSku) {
        return NextResponse.json({ error: `รหัส SKU "${sku}" มีอยู่ในระบบแล้ว` }, { status: 400 });
      }
    }

    if (barcode) {
      const existingBarcode = await prisma.product.findFirst({
        where: { barcode, deletedAt: null },
      });
      if (existingBarcode) {
        return NextResponse.json({ error: `บาร์โค้ด "${barcode}" มีอยู่ในระบบแล้ว` }, { status: 400 });
      }
    }

    const product = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const p = await tx.product.create({
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          image: image?.trim() || null,
          categoryId,
          sku: sku?.trim() || null,
          barcode: barcode?.trim() || null,
          costPrice: parseFloat(costPrice) || 0,
          sellingPrice: parseFloat(sellingPrice),
          stock: parseInt(stock, 10) || 0,
          lowStockThreshold: parseInt(lowStockThreshold, 10) || 5,
          status: status || 'ACTIVE',
        },
      });

      // Record initial inventory transaction if stock > 0
      if (p.stock > 0) {
        await tx.inventoryTransaction.create({
          data: {
            productId: p.id,
            type: 'IN',
            quantity: p.stock,
            previousStock: 0,
            newStock: p.stock,
            reason: 'Initial stock on product creation',
            userId: user.id,
          },
        });
      }

      // Create variants if provided
      if (Array.isArray(variants) && variants.length > 0) {
        for (const variant of variants) {
          if (variant.name && variant.price !== undefined) {
            await tx.productVariant.create({
              data: {
                productId: p.id,
                name: variant.name.trim(),
                sku: variant.sku?.trim() || null,
                costPrice: variant.costPrice ? parseFloat(variant.costPrice) : null,
                price: parseFloat(variant.price),
                stock: parseInt(variant.stock, 10) || 0,
                status: variant.status || 'ACTIVE',
              },
            });
          }
        }
      }

      return p;
    });

    await logAudit({
      userId: user.id,
      userName: user.name,
      action: 'CREATE_PRODUCT',
      entityType: 'PRODUCT',
      entityId: product.id,
      details: `Created product "${product.name}" with price ${product.sellingPrice}`,
    });

    return NextResponse.json({ success: true, product }, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating product:', error);
    const msg = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการเพิ่มสินค้า';
    if (msg === 'UNAUTHORIZED' || msg === 'FORBIDDEN') {
      return NextResponse.json({ error: 'คุณไม่มีสิทธิ์ทำรายการนี้' }, { status: 403 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
