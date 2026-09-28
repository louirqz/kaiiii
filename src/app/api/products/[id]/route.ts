import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { requireAuth, logAudit } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        variants: true,
      },
    });

    if (!product || product.deletedAt) {
      return NextResponse.json({ error: 'ไม่พบสินค้าที่ต้องการ' }, { status: 404 });
    }

    return NextResponse.json({ product });
  } catch (error) {
    console.error('Error getting product:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการโหลดสินค้า' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(['ADMIN', 'MANAGER']);
    const { id } = await params;
    const body = await req.json();

    const existingProduct = await prisma.product.findUnique({
      where: { id },
      include: { variants: true },
    });

    if (!existingProduct || existingProduct.deletedAt) {
      return NextResponse.json({ error: 'ไม่พบสินค้าที่ต้องการแก้ไข' }, { status: 404 });
    }

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

    const oldPrice = existingProduct.sellingPrice;
    const newPrice = sellingPrice !== undefined ? parseFloat(sellingPrice) : oldPrice;

    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const p = await tx.product.update({
        where: { id },
        data: {
          name: name !== undefined ? name.trim() : existingProduct.name,
          description: description !== undefined ? description?.trim() : existingProduct.description,
          image: image !== undefined ? image?.trim() : existingProduct.image,
          categoryId: categoryId || existingProduct.categoryId,
          sku: sku !== undefined ? (sku ? sku.trim() : null) : existingProduct.sku,
          barcode: barcode !== undefined ? (barcode ? barcode.trim() : null) : existingProduct.barcode,
          costPrice: costPrice !== undefined ? parseFloat(costPrice) : existingProduct.costPrice,
          sellingPrice: newPrice,
          stock: stock !== undefined ? parseInt(stock, 10) : existingProduct.stock,
          lowStockThreshold:
            lowStockThreshold !== undefined ? parseInt(lowStockThreshold, 10) : existingProduct.lowStockThreshold,
          status: status || existingProduct.status,
        },
      });

      // Handle variants update if provided
      if (Array.isArray(variants)) {
        // Delete variants not in the new list
        const incomingIds = variants.filter((v: { id?: string }) => v.id).map((v: { id?: string }) => v.id);
        await tx.productVariant.deleteMany({
          where: {
            productId: id,
            id: { notIn: incomingIds as string[] },
          },
        });

        // Upsert variants
        for (const variant of variants) {
          if (variant.id) {
            await tx.productVariant.update({
              where: { id: variant.id },
              data: {
                name: variant.name.trim(),
                sku: variant.sku?.trim() || null,
                costPrice: variant.costPrice ? parseFloat(variant.costPrice) : null,
                price: parseFloat(variant.price),
                stock: parseInt(variant.stock, 10) || 0,
                status: variant.status || 'ACTIVE',
              },
            });
          } else if (variant.name && variant.price !== undefined) {
            await tx.productVariant.create({
              data: {
                productId: id,
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

    // Check if price changed and log audit specifically
    if (oldPrice !== newPrice) {
      await logAudit({
        userId: user.id,
        userName: user.name,
        action: 'UPDATE_PRODUCT_PRICE',
        entityType: 'PRODUCT',
        entityId: id,
        details: `Admin changed product "${existingProduct.name}" price from ฿${oldPrice} to ฿${newPrice}`,
      });
    } else {
      await logAudit({
        userId: user.id,
        userName: user.name,
        action: 'UPDATE_PRODUCT',
        entityType: 'PRODUCT',
        entityId: id,
        details: `Updated product "${updated.name}" details`,
      });
    }

    return NextResponse.json({ success: true, product: updated });
  } catch (error: unknown) {
    console.error('Error updating product:', error);
    const msg = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการอัปเดตสินค้า';
    if (msg === 'UNAUTHORIZED' || msg === 'FORBIDDEN') {
      return NextResponse.json({ error: 'คุณไม่มีสิทธิ์ทำรายการนี้' }, { status: 403 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(['ADMIN']);
    const { id } = await params;

    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct || existingProduct.deletedAt) {
      return NextResponse.json({ error: 'ไม่พบสินค้าที่ต้องการลบ' }, { status: 404 });
    }

    // Soft delete
    await prisma.product.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: 'INACTIVE',
      },
    });

    await logAudit({
      userId: user.id,
      userName: user.name,
      action: 'SOFT_DELETE_PRODUCT',
      entityType: 'PRODUCT',
      entityId: id,
      details: `Soft deleted product "${existingProduct.name}"`,
    });

    return NextResponse.json({ success: true, message: 'ลบสินค้าเรียบร้อยแล้ว' });
  } catch (error: unknown) {
    console.error('Error deleting product:', error);
    const msg = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการลบสินค้า';
    if (msg === 'UNAUTHORIZED' || msg === 'FORBIDDEN') {
      return NextResponse.json({ error: 'คุณไม่มีสิทธิ์ทำรายการนี้ เฉพาะ ADMIN เท่านั้น' }, { status: 403 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
