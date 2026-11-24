/**
 * Motiba Sales Data Service Facade
 * Delegates domain operations to modular services:
 * - storeService
 * - productService
 * - visitService
 * - orderService
 * - ledgerService
 * - followUpService
 * - notificationService
 * - locationService
 */

import { storeService, STORE_COLUMNS, SALES_PROFILE_COLUMNS } from './store-service';
import { productService, PRODUCT_COLUMNS, CATEGORY_COLUMNS, BRAND_COLUMNS } from './product-service';
import { visitService, STORE_VISIT_COLUMNS } from './visit-service';
import { orderService, ORDER_COLUMNS, ORDER_ITEM_COLUMNS } from './order-service';
import { ledgerService, LEDGER_COLUMNS } from './ledger-service';
import { followUpService, FOLLOW_UP_COLUMNS } from './followup-service';
import { notificationService } from './notification-service';
import { locationService, LOCATION_COLUMNS } from './location-service';

export {
  STORE_COLUMNS,
  SALES_PROFILE_COLUMNS,
  PRODUCT_COLUMNS,
  CATEGORY_COLUMNS,
  BRAND_COLUMNS,
  STORE_VISIT_COLUMNS,
  ORDER_COLUMNS,
  ORDER_ITEM_COLUMNS,
  LEDGER_COLUMNS,
  FOLLOW_UP_COLUMNS,
  LOCATION_COLUMNS,
};

export const dataService = {
  // Store operations
  getStores: storeService.getStores.bind(storeService),
  getStoreById: storeService.getStoreById.bind(storeService),
  createStore: storeService.createStore.bind(storeService),

  // Product master catalog
  getProducts: productService.getProducts.bind(productService),
  getProductById: productService.getProductById.bind(productService),
  getCategories: productService.getCategories.bind(productService),
  getBrands: productService.getBrands.bind(productService),

  // Store beat visits
  getActiveVisit: visitService.getActiveVisit.bind(visitService),
  getVisitById: visitService.getVisitById.bind(visitService),
  getTodayVisits: visitService.getTodayVisits.bind(visitService),
  getStoreVisits: visitService.getStoreVisits.bind(visitService),
  startVisit: visitService.startVisit.bind(visitService),
  finishVisit: visitService.finishVisit.bind(visitService),

  // Orders
  getOrders: orderService.getOrders.bind(orderService),
  getOrderById: orderService.getOrderById.bind(orderService),
  createOrder: orderService.createOrder.bind(orderService),

  // Customer Ledger
  getStoreLedger: ledgerService.getStoreLedger.bind(ledgerService),
  recordPayment: ledgerService.recordPayment.bind(ledgerService),

  // Follow-ups
  getFollowUps: followUpService.getFollowUps.bind(followUpService),
  createFollowUp: followUpService.createFollowUp.bind(followUpService),
  updateFollowUpStatus: followUpService.updateFollowUpStatus.bind(followUpService),

  // Notifications
  getNotifications: notificationService.getNotifications.bind(notificationService),
  markNotificationRead: notificationService.markAsRead.bind(notificationService),
  markAllNotificationsRead: notificationService.markAllAsRead.bind(notificationService),

  // Location telemetry
  recordLocationPing: locationService.recordLocationPing.bind(locationService),
};
