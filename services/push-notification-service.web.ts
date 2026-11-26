export const pushNotificationService = {
  async registerForPushNotificationsAsync(_userId: string): Promise<string | null> {
    return null;
  },

  async unregisterPushTokenAsync(_userId?: string): Promise<void> {
    // No-op on web
  },

  subscribeToNotifications(
    _onReceived: () => void,
    _onTapped: (data: Record<string, any> | undefined) => void
  ): () => void {
    return () => {};
  },
};
