import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './query-keys';
import { storeService } from '@/services/store-service';
import { productService } from '@/services/product-service';
import { visitService } from '@/services/visit-service';
import { orderService } from '@/services/order-service';
import { ledgerService } from '@/services/ledger-service';
import { followUpService } from '@/services/followup-service';
import { notificationService } from '@/services/notification-service';
import { deliveryService } from '@/services/delivery-service';
import { Store, Product, Category, Brand, Order, StoreVisit, LedgerTransaction, FollowUp, NotificationItem, DeliveryAssignment, Warehouse } from '@/types';

// ================= STORES =================
export function useStores(salespersonId?: string) {
  return useQuery<Store[]>({
    queryKey: queryKeys.stores.list(salespersonId),
    queryFn: () => storeService.getStores(salespersonId),
  });
}

export function useStore(storeId?: string) {
  return useQuery<Store | null>({
    queryKey: queryKeys.stores.detail(storeId || ''),
    queryFn: () => (storeId ? storeService.getStoreById(storeId) : null),
    enabled: Boolean(storeId),
  });
}

// ================= PRODUCTS =================
export function useProducts() {
  return useQuery<Product[]>({
    queryKey: queryKeys.products.list(),
    queryFn: () => productService.getProducts(),
  });
}

export function useProduct(productId?: string) {
  return useQuery<Product | null>({
    queryKey: queryKeys.products.detail(productId || ''),
    queryFn: () => (productId ? productService.getProductById(productId) : null),
    enabled: Boolean(productId),
  });
}

export function useCategories() {
  return useQuery<Category[]>({
    queryKey: queryKeys.products.categories(),
    queryFn: () => productService.getCategories(),
  });
}

export function useBrands() {
  return useQuery<Brand[]>({
    queryKey: queryKeys.products.brands(),
    queryFn: () => productService.getBrands(),
  });
}

// ================= BEAT VISITS =================
export function useActiveVisit(salespersonId?: string) {
  return useQuery<StoreVisit | null>({
    queryKey: queryKeys.visits.active(salespersonId || ''),
    queryFn: () => (salespersonId ? visitService.getActiveVisit(salespersonId) : null),
    enabled: Boolean(salespersonId),
  });
}

export function useTodayVisits(salespersonId?: string) {
  return useQuery<StoreVisit[]>({
    queryKey: queryKeys.visits.today(salespersonId || ''),
    queryFn: () => (salespersonId ? visitService.getTodayVisits(salespersonId) : []),
    enabled: Boolean(salespersonId),
  });
}

export function useStoreVisits(storeId?: string) {
  return useQuery<StoreVisit[]>({
    queryKey: queryKeys.visits.byStore(storeId || ''),
    queryFn: () => (storeId ? visitService.getStoreVisits(storeId) : []),
    enabled: Boolean(storeId),
  });
}

// ================= ORDERS =================
export function useOrders(salespersonId?: string, status?: string) {
  return useQuery<Order[]>({
    queryKey: queryKeys.orders.list(salespersonId, status),
    queryFn: () => orderService.getOrders(salespersonId, status),
  });
}

export function useOrder(orderId?: string) {
  return useQuery<Order | null>({
    queryKey: queryKeys.orders.detail(orderId || ''),
    queryFn: () => (orderId ? orderService.getOrderById(orderId) : null),
    enabled: Boolean(orderId),
  });
}

// ================= LEDGER =================
export function useStoreLedger(storeId?: string) {
  return useQuery<LedgerTransaction[]>({
    queryKey: queryKeys.ledger.byStore(storeId || ''),
    queryFn: () => (storeId ? ledgerService.getStoreLedger(storeId) : []),
    enabled: Boolean(storeId),
  });
}

// ================= FOLLOW-UPS =================
export function useFollowUps(salespersonId?: string) {
  return useQuery<FollowUp[]>({
    queryKey: queryKeys.followUps.list(salespersonId || ''),
    queryFn: () => (salespersonId ? followUpService.getFollowUps(salespersonId) : []),
    enabled: Boolean(salespersonId),
  });
}

// ================= NOTIFICATIONS =================
export function useNotifications(userId?: string) {
  return useQuery<NotificationItem[]>({
    queryKey: queryKeys.notifications.list(userId),
    queryFn: () => notificationService.getNotifications(userId),
  });
}

export function useUnreadNotificationsCount(userId?: string) {
  return useQuery<number>({
    queryKey: queryKeys.notifications.unreadCount(userId),
    queryFn: () => notificationService.getUnreadCount(userId),
  });
}

// ================= DELIVERIES =================
export function useAssignedDeliveries(deliveryPersonId?: string, filterStatus?: string) {
  return useQuery<DeliveryAssignment[]>({
    queryKey: queryKeys.deliveries.list(deliveryPersonId || '', filterStatus),
    queryFn: () => (deliveryPersonId ? deliveryService.getAssignedDeliveries(deliveryPersonId, filterStatus) : []),
    enabled: Boolean(deliveryPersonId),
  });
}

export function useDelivery(assignmentId?: string, deliveryPersonId?: string) {
  return useQuery<DeliveryAssignment | null>({
    queryKey: queryKeys.deliveries.detail(assignmentId || ''),
    queryFn: () => (assignmentId ? deliveryService.getDeliveryById(assignmentId, deliveryPersonId) : null),
    enabled: Boolean(assignmentId),
  });
}

export function useCentralWarehouse() {
  return useQuery<Warehouse | null>({
    queryKey: queryKeys.deliveries.warehouse(),
    queryFn: () => deliveryService.getCentralWarehouse(),
  });
}
