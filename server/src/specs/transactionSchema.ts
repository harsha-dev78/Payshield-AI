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

// Canonical merchant product catalog for server-side price validation
export const VERIFIED_MERCHANT_CATALOG: Record<string, { id: string; name: string; price: number }> = {
  'prod-101': { id: 'prod-101', name: 'Hardware Security Key (FIDO2)', price: 65.00 },
  'prod-102': { id: 'prod-102', name: 'Encrypted NVMe SSD 1TB', price: 149.99 },
  'prod-103': { id: 'prod-103', name: 'Micro Network Firewall', price: 499.00 },
};

export interface ValidationResult {
  valid: boolean;
  error?: string;
  data?: z.infer<typeof TransactionDataSchema>;
}

/**
 * Validates transaction payload integrity on the backend.
 * Rejects price manipulation, quantity errors, invalid order IDs, and forged client states.
 */
export function validateTransactionIntegrity(payload: unknown): ValidationResult {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'Malformed request: payload must be a non-null JSON object.' };
  }

  const parsed = TransactionDataSchema.safeParse(payload);
  if (!parsed.success) {
    const errorMsg = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    return { valid: false, error: `Transaction validation failed: ${errorMsg}` };
  }

  const tx = parsed.data;

  // Validate order ID
  if (!tx.orderId || tx.orderId.trim().length < 3 || tx.orderId.length > 100) {
    return { valid: false, error: 'Invalid order identifier. Must be between 3 and 100 characters.' };
  }

  // Validate item prices against catalog if catalog item
  for (const item of tx.items) {
    if (item.quantity <= 0 || !Number.isInteger(item.quantity)) {
      return { valid: false, error: `Invalid item quantity (${item.quantity}) for item "${item.name}". Must be a positive integer.` };
    }
    if (item.price <= 0 || isNaN(item.price)) {
      return { valid: false, error: `Invalid unit price ($${item.price}) for item "${item.name}". Must be greater than 0.` };
    }

    const catalogItem = VERIFIED_MERCHANT_CATALOG[item.id];
    if (catalogItem) {
      if (Math.abs(item.price - catalogItem.price) > 0.01) {
        return {
          valid: false,
          error: `Price manipulation detected for item "${item.id}". Verified catalog price is $${catalogItem.price.toFixed(2)}, received $${item.price.toFixed(2)}.`,
        };
      }
    }
  }

  // Validate total amount matches sum of items
  const calculatedSum = tx.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  if (Math.abs(tx.amount - calculatedSum) > 0.01) {
    return {
      valid: false,
      error: `Amount manipulation detected. Total amount ($${tx.amount.toFixed(2)}) does not match items subtotal ($${calculatedSum.toFixed(2)}).`,
    };
  }

  return {
    valid: true,
    data: tx,
  };
}

