import { z } from 'zod';

const configSchema = z.object({
  supabaseUrl: z.string().url('EXPO_PUBLIC_SUPABASE_URL must be a valid URL'),
  supabaseAnonKey: z.string().min(1, 'EXPO_PUBLIC_SUPABASE_ANON_KEY is required'),
});

const parseConfig = () => {
  const envSupabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const envSupabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  const result = configSchema.safeParse({
    supabaseUrl: envSupabaseUrl,
    supabaseAnonKey: envSupabaseAnonKey,
  });

  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join(', ');
    throw new Error(
      `[Config] Missing or invalid environment configuration: ${formatted}. Check your .env file.`
    );
  }

  return result.data;
};

export const config = parseConfig();
