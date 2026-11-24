import { supabase } from '@/lib/supabase';
import { offlineStorage } from '@/lib/offline-storage';
import { Product, Category, Brand } from '@/types';
import { logger } from '@/lib/logger';

export const PRODUCT_COLUMNS =
  'id, name, sku, barcode, image_url, brand_id, category_id, sub_category, description, pack_size, unit, mrp, selling_price, distributor_price, min_order_qty, max_order_qty, tax_rate, is_active, status, created_at, updated_at' as const;

export const CATEGORY_COLUMNS =
  'id, name, code, description, image_url, status, created_at, updated_at' as const;

export const BRAND_COLUMNS =
  'id, name, description, logo_url, status, created_at, updated_at' as const;

export const productService = {
  async getProducts(): Promise<Product[]> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`${PRODUCT_COLUMNS}, brand:brands(${BRAND_COLUMNS}), category:categories(${CATEGORY_COLUMNS})`)
        .eq('status', 'active')
        .order('name');

      if (error) {
        logger.warn('Products fetch error, using cache:', error);
        return await offlineStorage.getProducts();
      }

      const products = ((data || []) as unknown) as Product[];
      await offlineStorage.saveProducts(products);
      return products;
    } catch (err) {
      logger.warn('Network exception loading products, using cache:', err);
      return await offlineStorage.getProducts();
    }
  },

  async getProductById(productId: string): Promise<Product | null> {
    const { data, error } = await supabase
      .from('products')
      .select(`${PRODUCT_COLUMNS}, brand:brands(${BRAND_COLUMNS}), category:categories(${CATEGORY_COLUMNS})`)
      .eq('id', productId)
      .maybeSingle();

    if (error) return null;
    return data as Product | null;
  },

  async getCategories(): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select(CATEGORY_COLUMNS)
      .eq('status', 'active')
      .order('name');

    if (error) return [];
    return (data || []) as Category[];
  },

  async getBrands(): Promise<Brand[]> {
    const { data, error } = await supabase
      .from('brands')
      .select(BRAND_COLUMNS)
      .eq('status', 'active')
      .order('name');

    if (error) return [];
    return (data || []) as Brand[];
  },
};
