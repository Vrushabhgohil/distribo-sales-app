import { z } from 'zod';

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, 'Please enter a valid 10-digit mobile number starting with 6-9');

export const optionalPhoneSchema = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, 'Please enter a valid 10-digit mobile number')
  .optional()
  .or(z.literal(''));

export const pincodeSchema = z
  .string()
  .trim()
  .regex(/^[1-9]\d{5}$/, 'Please enter a valid 6-digit Indian PIN code');

export const gstSchema = z
  .string()
  .trim()
  .regex(
    /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
    'Please enter a valid 15-character GSTIN (e.g. 24ABCDE1234F1Z5)'
  )
  .optional()
  .or(z.literal(''));

export const latitudeSchema = z
  .number()
  .min(-90, 'Latitude must be between -90 and 90')
  .max(90, 'Latitude must be between -90 and 90')
  .optional()
  .nullable();

export const longitudeSchema = z
  .number()
  .min(-180, 'Longitude must be between -180 and 180')
  .max(180, 'Longitude must be between -180 and 180')
  .optional()
  .nullable();

export const storeFormSchema = z.object({
  name: z.string().trim().min(2, 'Store name must be at least 2 characters'),
  owner_name: z.string().trim().min(2, 'Owner name must be at least 2 characters'),
  mobile: phoneSchema,
  alternate_mobile: optionalPhoneSchema,
  email: z
    .string()
    .trim()
    .email('Please enter a valid email address')
    .optional()
    .or(z.literal(''))
    .nullable(),
  address: z.string().trim().min(3, 'Address must be at least 3 characters'),
  area: z.string().trim().min(2, 'Area/Beat territory is required'),
  city: z.string().trim().min(2, 'City is required'),
  pincode: pincodeSchema,
  store_type: z.string().trim().min(1, 'Store type is required'),
  credit_limit: z
    .number()
    .nonnegative('Credit limit cannot be negative')
    .default(0),
  payment_terms: z.string().trim().optional().nullable(),
  gst_number: gstSchema,
  gps_lat: latitudeSchema,
  gps_lng: longitudeSchema,
});

export type StoreFormInput = z.infer<typeof storeFormSchema>;
