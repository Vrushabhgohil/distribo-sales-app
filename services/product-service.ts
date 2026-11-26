import { supabase } from '@/lib/supabase';
import { offlineStorage } from '@/lib/offline-storage';
import { Product, Category, Brand } from '@/types';
import { logger } from '@/lib/logger';

export const PRODUCT_COLUMNS =
  'id, name, sku, barcode, image_url, brand_id, category_id, sub_category, description, pack_size, unit, mrp, selling_price, distributor_price, gst_percentage, min_order_qty, max_order_qty, status, created_at, updated_at' as const;

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

      let rawProducts: any[] = data || [];

      if (error) {
        logger.warn('Products primary fetch error, trying fallback:', error);
        const fallback = await supabase
          .from('products')
          .select('*')
          .order('name');
        if (fallback.error) {
          logger.warn('Products fallback fetch error, using cache:', fallback.error);
          return await offlineStorage.getProducts();
        }
        rawProducts = (fallback.data || []).filter((p: any) => p.status !== 'inactive' && p.is_active !== false);
      }

      // Fetch available inventory quantities if accessible
      let stockByProduct = new Map<string, number>();
      try {
        const { data: invData } = await supabase
          .from('inventory')
          .select('product_id, available_stock, current_stock');
        if (invData) {
          invData.forEach((row: any) => {
            const qty = typeof row.available_stock === 'number' ? row.available_stock : row.current_stock;
            if (typeof qty === 'number') {
              stockByProduct.set(row.product_id, qty);
            }
          });
        }
      } catch {
        // Inventory table may not be readable in all environments; ignore gracefully
      }

      const products: Product[] = rawProducts.map((p: any) => ({
        ...p,
        gst_percentage: typeof p.gst_percentage === 'number' ? p.gst_percentage : (p.tax_rate ?? 0),
        stock_quantity: stockByProduct.has(p.id) ? stockByProduct.get(p.id) : p.stock_quantity,
      }));

      await offlineStorage.saveProducts(products);
      return products;
    } catch (err) {
      logger.warn('Network exception loading products, using cache:', err);
      return await offlineStorage.getProducts();
    }
  },

  async getProductById(productId: string): Promise<Product | null> {
    try {
      let raw: any = null;
      const { data, error } = await supabase
        .from('products')
        .select(`${PRODUCT_COLUMNS}, brand:brands(${BRAND_COLUMNS}), category:categories(${CATEGORY_COLUMNS})`)
        .eq('id', productId)
        .maybeSingle();

      if (error) {
        logger.warn('getProductById primary error, trying fallback:', error);
        const fallback = await supabase
          .from('products')
          .select('*')
          .eq('id', productId)
          .maybeSingle();
        if (fallback.error) {
          const cached = await offlineStorage.getProducts();
          return cached.find((p) => p.id === productId) || null;
        }
        raw = fallback.data;
      } else {
        raw = data;
      }

      if (!raw) return null;

      let stockQty: number | undefined = raw.stock_quantity;
      try {
        const { data: inv } = await supabase
          .from('inventory')
          .select('available_stock, current_stock')
          .eq('product_id', productId)
          .maybeSingle();
        if (inv) {
          stockQty = typeof inv.available_stock === 'number' ? inv.available_stock : inv.current_stock;
        }
      } catch {
        // Ignore if inventory is unreadable
      }

      return {
        ...raw,
        gst_percentage: typeof raw.gst_percentage === 'number' ? raw.gst_percentage : (raw.tax_rate ?? 0),
        stock_quantity: stockQty,
      } as Product;
    } catch {
      const cached = await offlineStorage.getProducts();
      return cached.find((p) => p.id === productId) || null;
    }
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
