import prisma from '@/lib/prisma';
import { generatePromptPayPayload, generatePromptPayQRCodeDataURL } from '@/lib/promptpay';
import { CreatePaymentInput, PaymentMethod, PaymentProvider, PaymentResult, PaymentStatus } from './types';

/**
 * Standard PromptPay Mock/Dev Provider for Thailand QR Payment
 */
export class PromptPayPaymentProvider implements PaymentProvider {
  name = 'PROMPTPAY_STANDARD';
  isMock = process.env.NODE_ENV !== 'production' || process.env.PAYMENT_ENV === 'sandbox';

  async createPayment(input: CreatePaymentInput): Promise<PaymentResult> {
    const setting = await prisma.storeSetting.findUnique({ where: { id: 'default' } });
    const target = input.promptPayTarget || setting?.promptPayId || process.env.PROMPTPAY_ID || '0891234567';

    let qrPayload: string | undefined;
    let qrCodeUrl: string | undefined;

    if (input.method === 'QR_PROMPTPAY') {
      qrPayload = generatePromptPayPayload(target, input.amount);
      qrCodeUrl = await generatePromptPayQRCodeDataURL(target, input.amount);
    }

    const referenceNo = `PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const payment = await prisma.payment.create({
      data: {
        orderId: input.orderId,
        method: input.method,
        status: 'PENDING',
        amount: input.amount,
        referenceNo,
        qrPayload,
        provider: this.name,
      },
    });

    return {
      id: payment.id,
      orderId: payment.orderId,
      status: payment.status as PaymentStatus,
      method: payment.method as PaymentMethod,
      amount: payment.amount,
      qrPayload: payment.qrPayload ?? undefined,
      qrCodeUrl,
      provider: payment.provider,
      referenceNo: payment.referenceNo ?? undefined,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }

  async checkPaymentStatus(paymentId: string): Promise<PaymentStatus> {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    });
    if (!payment) throw new Error('Payment not found');
    return payment.status as PaymentStatus;
  }

  async confirmPayment(
    paymentId: string,
    amountTendered?: number,
    changeGiven?: number
  ): Promise<PaymentResult> {
    // Perform transactional update: Payment PAID + Order PAID + Inventory deduction (Idempotent)
    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
        include: {
          order: {
            include: {
              items: true,
            },
          },
        },
      });

      if (!payment) throw new Error('Payment record not found');
      if (payment.status === 'PAID') {
        // Idempotency: Already paid, do not deduct inventory again
        return payment;
      }

      // 1. Update Payment status
      const updatedPayment = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: 'PAID',
          amountTendered: amountTendered ?? payment.amount,
          changeGiven: changeGiven ?? 0,
        },
      });

      // 2. Update Order status
      await tx.order.update({
        where: { id: payment.orderId },
        data: {
          paymentStatus: 'PAID',
          orderStatus: 'PAID',
        },
      });

      // 3. Deduct stock for each order item with safety checks
      for (const item of payment.order.items) {
        if (item.variantId) {
          const variant = await tx.productVariant.findUnique({
            where: { id: item.variantId },
          });
          if (variant) {
            const prevStock = variant.stock;
            const newStock = Math.max(0, prevStock - item.quantity);

            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { stock: newStock },
            });

            await tx.inventoryTransaction.create({
              data: {
                productId: variant.productId,
                variantId: variant.id,
                type: 'SALE',
                quantity: -item.quantity,
                previousStock: prevStock,
                newStock: newStock,
                reason: `Order ${payment.order.orderNumber} fulfilled`,
                orderId: payment.orderId,
              },
            });
          }
        } else if (item.productId) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
          });
          if (product) {
            const prevStock = product.stock;
            const newStock = Math.max(0, prevStock - item.quantity);

            await tx.product.update({
              where: { id: item.productId },
              data: { stock: newStock },
            });

            await tx.inventoryTransaction.create({
              data: {
                productId: product.id,
                type: 'SALE',
                quantity: -item.quantity,
                previousStock: prevStock,
                newStock: newStock,
                reason: `Order ${payment.order.orderNumber} fulfilled`,
                orderId: payment.orderId,
              },
            });
          }
        }
      }

      return updatedPayment;
    });

    return {
      id: result.id,
      orderId: result.orderId,
      status: result.status as PaymentStatus,
      method: result.method as PaymentMethod,
      amount: result.amount,
      qrPayload: result.qrPayload ?? undefined,
      provider: result.provider,
      referenceNo: result.referenceNo ?? undefined,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };
  }

  async cancelPayment(paymentId: string, reason?: string): Promise<PaymentResult> {
    const payment = await prisma.$transaction(async (tx) => {
      const p = await tx.payment.update({
        where: { id: paymentId },
        data: { status: 'CANCELLED' },
      });

      await tx.order.update({
        where: { id: p.orderId },
        data: {
          paymentStatus: 'CANCELLED',
          orderStatus: 'CANCELLED',
          notes: reason ? `Cancelled: ${reason}` : undefined,
        },
      });

      return p;
    });

    return {
      id: payment.id,
      orderId: payment.orderId,
      status: payment.status as PaymentStatus,
      method: payment.method as PaymentMethod,
      amount: payment.amount,
      qrPayload: payment.qrPayload ?? undefined,
      provider: payment.provider,
      referenceNo: payment.referenceNo ?? undefined,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }

  async expirePayment(paymentId: string): Promise<PaymentResult> {
    const payment = await prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'EXPIRED' },
    });
    return {
      id: payment.id,
      orderId: payment.orderId,
      status: payment.status as PaymentStatus,
      method: payment.method as PaymentMethod,
      amount: payment.amount,
      qrPayload: payment.qrPayload ?? undefined,
      provider: payment.provider,
      referenceNo: payment.referenceNo ?? undefined,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }
}

/**
 * Payment Service orchestrator
 */
export class PaymentService {
  private static provider: PaymentProvider = new PromptPayPaymentProvider();

  public static setProvider(provider: PaymentProvider) {
    PaymentService.provider = provider;
  }

  public static getProvider(): PaymentProvider {
    return PaymentService.provider;
  }

  public static async createPayment(input: CreatePaymentInput): Promise<PaymentResult> {
    return PaymentService.provider.createPayment(input);
  }

  public static async checkPaymentStatus(paymentId: string): Promise<PaymentStatus> {
    return PaymentService.provider.checkPaymentStatus(paymentId);
  }

  public static async confirmPayment(
    paymentId: string,
    amountTendered?: number,
    changeGiven?: number
  ): Promise<PaymentResult> {
    return PaymentService.provider.confirmPayment(paymentId, amountTendered, changeGiven);
  }

  public static async cancelPayment(paymentId: string, reason?: string): Promise<PaymentResult> {
    return PaymentService.provider.cancelPayment(paymentId, reason);
  }

  public static async expirePayment(paymentId: string): Promise<PaymentResult> {
    return PaymentService.provider.expirePayment(paymentId);
  }
}
