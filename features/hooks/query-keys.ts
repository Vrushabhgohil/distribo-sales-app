/**
 * TanStack Query Key Factories
 * Consistent cache key hierarchy for deterministic invalidation.
 */

export const queryKeys = {
  stores: {
    all: ['stores'] as const,
    list: (salespersonId?: string) => ['stores', 'list', salespersonId || 'all'] as const,
    detail: (storeId: string) => ['stores', 'detail', storeId] as const,
  },
  products: {
    all: ['products'] as const,
    list: () => ['products', 'list'] as const,
    detail: (productId: string) => ['products', 'detail', productId] as const,
    categories: () => ['products', 'categories'] as const,
    brands: () => ['products', 'brands'] as const,
  },
  visits: {
    all: ['visits'] as const,
    active: (salespersonId: string) => ['visits', 'active', salespersonId] as const,
    today: (salespersonId: string) => ['visits', 'today', salespersonId] as const,
    byStore: (storeId: string) => ['visits', 'store', storeId] as const,
    detail: (visitId: string) => ['visits', 'detail', visitId] as const,
  },
  orders: {
    all: ['orders'] as const,
    list: (salespersonId?: string, status?: string) =>
      ['orders', 'list', salespersonId || 'all', status || 'all'] as const,
    detail: (orderId: string) => ['orders', 'detail', orderId] as const,
  },
  ledger: {
    all: ['ledger'] as const,
    byStore: (storeId: string) => ['ledger', 'store', storeId] as const,
  },
  followUps: {
    all: ['follow-ups'] as const,
    list: (salespersonId: string) => ['follow-ups', 'list', salespersonId] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    list: (userId?: string) => ['notifications', 'list', userId || 'current'] as const,
    unreadCount: (userId?: string) => ['notifications', 'unread', userId || 'current'] as const,
  },
  deliveries: {
    all: ['deliveries'] as const,
    list: (deliveryPersonId: string, filterStatus?: string) =>
      ['deliveries', 'list', deliveryPersonId, filterStatus || 'all'] as const,
    detail: (assignmentId: string) => ['deliveries', 'detail', assignmentId] as const,
    warehouse: () => ['deliveries', 'warehouse'] as const,
  },
};
