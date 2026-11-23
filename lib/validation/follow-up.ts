import { z } from 'zod';

export const followUpFormSchema = z.object({
  storeId: z.string().uuid('Invalid store identifier'),
  followUpDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD'),
  reason: z.string().trim().min(2, 'Reason must be at least 2 characters'),
  status: z.enum(['pending', 'completed', 'cancelled']).default('pending'),
  notes: z.string().trim().optional(),
});

export type FollowUpFormInput = z.infer<typeof followUpFormSchema>;
