import { z } from 'zod';

export const paymentFormSchema = z.object({
  storeId: z.string().uuid('Invalid store identifier'),
  amount: z
    .number()
    .positive('Payment amount must be greater than zero'),
  paymentMode: z.enum(['cash', 'upi', 'cheque', 'bank_transfer', 'neft']),
  referenceNumber: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export type PaymentFormInput = z.infer<typeof paymentFormSchema>;
