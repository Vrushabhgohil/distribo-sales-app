import { z } from 'zod';
import { latitudeSchema, longitudeSchema } from './store';

export const visitFormSchema = z.object({
  storeId: z.string().uuid('Invalid store identifier'),
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  notes: z.string().trim().optional(),
  outcome: z.string().trim().optional(),
});

export type VisitFormInput = z.infer<typeof visitFormSchema>;
