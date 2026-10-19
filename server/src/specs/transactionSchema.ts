import { z } from 'zod';

export const TelemetrySchema = z.object({
  ipAddress: z.string().optional().default(''),
  ipCountry: z.string().optional().default(''),
  isProxyOrVpn: z.boolean().optional().default(false),
  deviceFingerprint: z.string().optional().default(''),
  userAgent: z.string().optional().default(''),
  billingCountry: z.string().optional().default(''),
  shippingCountry: z.string().optional().default(''),
  shippingAddressMatchesBilling: z.boolean().optional(),
  emailDomain: z.string().optional().default(''),
  isDisposableEmail: z.boolean().optional().default(false),
  accountAgeDays: z.number().nonnegative().optional(),
  ordersInLast24Hours: z.number().nonnegative().optional().default(0),
  failedAttemptsInLastHour: z.number().nonnegative().optional().default(0),
}).default({});

export const OrderItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number().positive(),
  quantity: z.number().int().positive().default(1),
  category: z.string().optional(),
});

export const CustomerSchema = z.object({
  name: z.string().min(1, 'Customer name is required'),
  email: z.string().email('Valid customer email is required'),
  phone: z.string().optional(),
});

export const TransactionDataSchema = z.object({
  orderId: z.string().min(1, 'orderId is required'),
  amount: z.number().positive('amount must be positive'),
  currency: z.string().default('USD'),
  customer: CustomerSchema,
  items: z.array(OrderItemSchema).min(1, 'At least one item is required'),
  telemetry: TelemetrySchema,
  createdAt: z.string().optional(),
});

export const MerchantOverrideSchema = z.object({
  action: z.enum(['ALLOW', 'BLOCK'], {
    errorMap: () => ({ message: "Action must be either 'ALLOW' or 'BLOCK'" }),
  }),
  notes: z.string().optional(),
});
