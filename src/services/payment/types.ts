export type PaymentMethod = 'CASH' | 'QR_PROMPTPAY' | 'OTHER';

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'EXPIRED';

export interface CreatePaymentInput {
  orderId: string;
  amount: number;
  method: PaymentMethod;
  promptPayTarget?: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentResult {
  id: string;
  orderId: string;
  status: PaymentStatus;
  method: PaymentMethod;
  amount: number;
  qrPayload?: string;
  qrCodeUrl?: string;
  provider: string;
  referenceNo?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentProvider {
  name: string;
  isMock: boolean;
  createPayment(input: CreatePaymentInput): Promise<PaymentResult>;
  checkPaymentStatus(paymentId: string): Promise<PaymentStatus>;
  confirmPayment(paymentId: string, amountTendered?: number, changeGiven?: number): Promise<PaymentResult>;
  cancelPayment(paymentId: string, reason?: string): Promise<PaymentResult>;
  expirePayment(paymentId: string): Promise<PaymentResult>;
}
