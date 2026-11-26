import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { NotificationItem } from '@/types';

// Explicit column projection constants - no select('*') on application tables
const NOTIFICATION_COLUMNS =
  'id, user_id, title, message, type, is_read, data, created_at';

export const notificationService = {
  /**
   * Fetches user-scoped and broadcast notifications.
   * Server RLS enforces (user_id = auth.uid() OR user_id IS NULL) server-side.
   */
  async getNotifications(_userId?: string): Promise<NotificationItem[]> {
    if (!isSupabaseConfigured) return [];

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select(NOTIFICATION_COLUMNS)
        .in('type', ['delivery', 'order', 'follow_up', 'system'])
        .order('created_at', { ascending: false })
        .limit(40);

      if (error) {
        console.warn('Notifications fetch error:', error);
        return [];
      }
      return (data || []) as NotificationItem[];
    } catch {
      return [];
    }
  },

  async markAsRead(notificationId: string): Promise<void> {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
    } catch (err) {
      console.warn('Mark as read error:', err);
    }
  },

  async markAllAsRead(): Promise<void> {
    try {
      await supabase.rpc('mark_all_notifications_read');
    } catch (err) {
      console.warn('Mark all as read error:', err);
    }
  },

  /**
   * Retrieves unread notification count.
   * Server RLS automatically filters by auth.uid() or NULL broadcast.
   */
  async getUnreadCount(_userId?: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('is_read', false)
        .in('type', ['delivery', 'order', 'follow_up', 'system']);

      if (error) return 0;
      return count || 0;
    } catch {
      return 0;
    }
  },
};

