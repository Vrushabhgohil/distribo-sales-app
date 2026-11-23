import { z } from 'zod';

/**
 * Shared authentication validation schemas.
 * Passwords are NOT trimmed to preserve user input and entropy.
 * Minimum password length is enforced at 10 characters.
 */
export const passwordSchema = z
  .string()
  .min(10, 'Password must be at least 10 characters long');

export const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, 'Please enter your work email or Employee ID.'),
  password: passwordSchema,
  rememberMe: z.boolean().default(true),
});

export const signUpSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, 'Please enter your full legal name.'),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email('Please enter a valid corporate email address.'),
    mobile: z
      .string()
      .trim()
      .regex(/^[6-9]\d{9}$/, 'Please enter a valid 10-digit mobile number.'),
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    assignedArea: z.string().trim().optional(),
    agreeTerms: z.literal(true, {
      message: 'Please accept the sales guidelines to continue.',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match. Please verify.',
    path: ['confirmPassword'],
  });

export const updatePasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match. Please verify both fields.',
    path: ['confirmPassword'],
  });

export const resetPasswordRequestSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Please enter a valid corporate email address.'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;
