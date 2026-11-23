import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { NotificationItem } from '@/types';

export const notificationService = {
  async getNotifications(userId?: string): Promise<NotificationItem[]> {
    if (!isSupabaseConfigured) return [];

    try {
      let query = supabase
        .from('notifications')
        .select('*')
        .in('type', ['delivery', 'order', 'system'])
        .order('created_at', { ascending: false })
        .limit(40);

      if (userId) {
        query = query.or(`user_id.eq.${userId},user_id.is.null`);
      }

      const { data, error } = await query;
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

  async getUnreadCount(userId?: string): Promise<number> {
    try {
      let query = supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('is_read', false)
        .in('type', ['delivery', 'order', 'system']);

      if (userId) {
        query = query.or(`user_id.eq.${userId},user_id.is.null`);
      }

      const { count, error } = await query;
      if (error) return 0;
      return count || 0;
    } catch {
      return 0;
    }
  },
};

