import { z } from 'zod';

export const orderItemInputSchema = z.object({
  productId: z.string().uuid('Invalid product identifier'),
  quantity: z
    .number()
    .int('Quantity must be a whole number')
    .positive('Quantity must be at least 1'),
});

export const orderFormSchema = z.object({
  storeId: z.string().uuid('Invalid store identifier'),
  items: z.array(orderItemInputSchema).min(1, 'Order must contain at least one product'),
  notes: z.string().trim().optional(),
});

export type OrderFormInput = z.infer<typeof orderFormSchema>;
