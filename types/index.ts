export type Role =
  | 'admin'
  | 'manager'
  | 'sales_rep'
  | 'delivery_pilot'
  | 'sales_person'
  | 'delivery_person';

export type UserRole = 'sales_person' | 'delivery_person';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string | null;
  role: Role;
  created_at: string;
  updated_at: string;
}

export interface SalesPersonProfile {
  id: string;
  user_id: string | null;
  name: string;
  employee_id: string;
  photo_url?: string | null;
  mobile: string;
  email: string;
  address?: string | null;
  joining_date: string;
  assigned_area?: string | null;
  status: 'pending' | 'active' | 'inactive';
  location_consent_version?: string | null;
  location_consent_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeliveryPersonProfile {
  id: string;
  user_id: string | null;
  name: string;
  employee_id: string;
  photo_url?: string | null;
  mobile: string;
  email: string;
  address?: string | null;
  vehicle_type: string;
  vehicle_number: string;
  status: 'pending' | 'active' | 'inactive';
  location_consent_version?: string | null;
  location_consent_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  contact_person?: string | null;
  contact_mobile?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Store {
  id: string;
  name: string;
  owner_name: string;
  mobile: string;
  alternate_mobile?: string | null;
  email?: string | null;
  address: string;
  area: string;
  city: string;
  pincode: string;
  gps_lat?: number | null;
  gps_lng?: number | null;
  gst_number?: string | null;
  store_type: string;
  assigned_salesperson_id?: string | null;
  credit_limit: number;
  payment_terms?: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  assigned_salesperson?: SalesPersonProfile;
}

export interface Category {
  id: string;
  name: string;
  description?: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface Brand {
  id: string;
  name: string;
  description?: string | null;
  logo_url?: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string | null;
  image_url?: string | null;
  brand_id?: string | null;
  category_id?: string | null;
  sub_category?: string | null;
  description?: string | null;
  pack_size: string;
  unit: string;
  mrp: number;
  selling_price: number;
  distributor_price: number;
  gst_percentage: number;
  min_order_qty: number;
  max_order_qty?: number | null;
  stock_quantity?: number;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  brand?: Brand;
  category?: Category;
}

export interface Inventory {
  id: string;
  product_id: string;
  current_stock: number;
  available_stock: number;
  reserved_stock: number;
  incoming_stock: number;
  outgoing_stock: number;
  low_stock_threshold: number;
  created_at: string;
  updated_at: string;
  product?: Product;
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'ready_for_delivery'
  | 'out_for_delivery'
  | 'partially_delivered'
  | 'delivered'
  | 'rejected'
  | 'cancelled';

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  delivered_quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
  product?: Product;
}

export interface Order {
  id: string;
  order_number: string;
  store_id: string;
  salesperson_id: string;
  order_date: string;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  notes?: string | null;
  status: OrderStatus;
  rejection_reason?: string | null;
  confirmed_by?: string | null;
  confirmed_at?: string | null;
  created_at: string;
  updated_at: string;
  store?: Store;
  salesperson?: SalesPersonProfile | {
    id: string;
    name: string;
    employee_id: string;
    mobile: string;
  };
  items?: OrderItem[];
}

export type DeliveryAssignmentStatus =
  | 'assigned'
  | 'in_transit'
  | 'delivered'
  | 'partially_delivered'
  | 'failed';

export interface DeliveryAssignment {
  id: string;
  order_id: string;
  delivery_person_id: string;
  assigned_date: string;
  status: DeliveryAssignmentStatus;
  delivery_notes?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
  order?: Order;
  delivery_person?: DeliveryPersonProfile;
}

export interface StoreVisit {
  id: string;
  store_id: string;
  salesperson_id: string;
  visit_date: string;
  check_in_time: string;
  check_out_time?: string | null;
  notes?: string | null;
  outcome?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  created_at: string;
  store?: Store;
}

export interface LocationEntry {
  id: string;
  salesperson_id?: string | null;
  delivery_person_id?: string | null;
  latitude: number;
  longitude: number;
  status: 'online' | 'travelling' | 'on_visit' | 'idle' | 'offline';
  store_id?: string | null;
  recorded_at: string;
}

export interface LedgerTransaction {
  id: string;
  store_id: string;
  transaction_date: string;
  description: string;
  reference_type?: string | null;
  reference_id?: string | null;
  debit: number;
  credit: number;
  running_balance: number;
  created_at: string;
}

export interface FollowUp {
  id: string;
  store_id: string;
  salesperson_id: string;
  follow_up_date: string;
  follow_up_time?: string | null;
  reason: string;
  notes?: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'completed' | 'overdue' | 'cancelled';
  created_at: string;
  updated_at: string;
  store?: Store;
  salesperson?: SalesPersonProfile;
}

export interface NotificationItem {
  id: string;
  user_id?: string | null;
  title: string;
  message: string;
  type: 'order' | 'delivery' | 'inventory' | 'follow_up' | 'system';
  reference_type?: string | null;
  reference_id?: string | null;
  is_read: boolean;
  created_at: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface OfflineQueueItem {
  id: string;
  idempotencyKey: string;
  action:
    | 'CONFIRM_PICKUP'
    | 'START_DELIVERY'
    | 'COMPLETE_DELIVERY'
    | 'RECORD_PARTIAL_DELIVERY'
    | 'CREATE_STORE'
    | 'START_VISIT'
    | 'FINISH_VISIT'
    | 'CREATE_ORDER'
    | 'CREATE_FOLLOWUP';
  payload: Record<string, any>;
  timestamp: number;
  status: 'pending' | 'syncing' | 'failed';
  attempts: number;
  lastAttemptAt?: number;
  nextRetryAt?: number;
  error?: string;
}
