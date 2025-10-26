// src/services/notificationService.ts
export interface Notification {
  id: string;
  type: 'OUTBID' | 'AUCTION_ENDING' | 'AUCTION_WON' | 'NEW_BID' | 'BID_CONFIRMED' | 'PAYMENT_REMINDER' | 'AUCTION_SOLD' | 'NEW_MESSAGE';
  title: string;
  message: string;
  userId: string;
  relatedId?: string;
  read: boolean;
  createdAt: string;
  metadata?: any;
}

export class NotificationService {
  private static instance: NotificationService;
  private notifications: Map<string, Notification[]> = new Map();
  private listeners: Map<string, Set<(notification: Notification) => void>> = new Map();
  private storageKey = 'auction-notifications';

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
      NotificationService.instance.loadFromStorage();
    }
    return NotificationService.instance;
  }

  // Load notifications from localStorage
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        this.notifications = new Map(Object.entries(data));
      }
    } catch (error) {
      console.error('Error loading notifications from storage:', error);
    }
  }

  // Save notifications to localStorage
  private saveToStorage(): void {
    try {
      const data = Object.fromEntries(this.notifications);
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving notifications to storage:', error);
    }
  }

  // Get notifications from API and sync with local storage
  async syncNotificationsFromAPI(userId: string): Promise<void> {
    try {
      const response = await fetch(
        `https://wckv09j9eg.execute-api.us-east-1.amazonaws.com/prod/sendMessage?action=getNotifications&userId=${userId}`
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch notifications from API: ${response.status}`);
      }
      
      const data = await response.json();
      const apiNotifications = data.notifications || [];
      
      // Convert API notifications to our format
      const convertedNotifications: Notification[] = apiNotifications.map((apiNotif: any) => ({
        id: apiNotif.notificationId,
        type: this.mapNotificationType(apiNotif.type),
        title: this.getNotificationTitle(apiNotif.type),
        message: apiNotif.message,
        userId: apiNotif.userId,
        read: apiNotif.read,
        createdAt: apiNotif.timestamp,
        metadata: {
          originalType: apiNotif.type,
          ...apiNotif
        }
      }));

      // Update local storage with API data
      this.notifications.set(userId, convertedNotifications);
      this.saveToStorage();

      // Notify listeners about the new notifications
      convertedNotifications.forEach(notification => {
        this.notifyUser(userId, notification);
      });

    } catch (error) {
      console.error('Error syncing notifications from API:', error);
      // Silently fail - we'll use local storage data
    }
  }

  // Map API notification types to our types
  private mapNotificationType(apiType: string): Notification['type'] {
    const typeMap: { [key: string]: Notification['type'] } = {
      'message': 'NEW_MESSAGE',
      'AUCTION_SOLD': 'AUCTION_SOLD'
    };
    return typeMap[apiType] || 'NEW_MESSAGE';
  }

  // Generate title based on notification type
  private getNotificationTitle(type: string): string {
    const titleMap: { [key: string]: string } = {
      'message': 'New Message',
      'AUCTION_SOLD': 'Auction Sold'
    };
    return titleMap[type] || 'Notification';
  }

  // Add notification and broadcast to listeners
  addNotification(notification: Omit<Notification, 'id' | 'createdAt' | 'read'>): void {
    const fullNotification: Notification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      read: false
    };

    // Store in memory
    if (!this.notifications.has(notification.userId)) {
      this.notifications.set(notification.userId, []);
    }
    this.notifications.get(notification.userId)!.unshift(fullNotification);

    // Save to localStorage for persistence
    this.saveToStorage();

    // Notify the specific user in real-time
    this.notifyUser(notification.userId, fullNotification);

    console.log('📢 Notification created:', fullNotification);
  }

  // Real-time notification delivery to specific user
  private notifyUser(userId: string, notification: Notification): void {
    const userListeners = this.listeners.get(userId);
    if (userListeners) {
      userListeners.forEach(listener => listener(notification));
    }
  }

  // Get notifications for user (with API sync)
  async getUserNotifications(userId: string): Promise<Notification[]> {
    try {
      // Sync with API first to get latest notifications
      await this.syncNotificationsFromAPI(userId);
    } catch (error) {
      console.error('Error in getUserNotifications:', error);
      // Continue with local data if API fails
    }
    
    // Always return an array, never undefined
    return this.notifications.get(userId) || [];
  }

  // Mark notification as read
  markAsRead(notificationId: string, userId: string): void {
    const userNotifications = this.notifications.get(userId);
    if (userNotifications) {
      const notification = userNotifications.find(n => n.id === notificationId);
      if (notification) {
        notification.read = true;
        this.saveToStorage();
        this.notifyUser(userId, notification);
      }
    }
  }

  // Mark all as read
  markAllAsRead(userId: string): void {
    const userNotifications = this.notifications.get(userId);
    if (userNotifications) {
      userNotifications.forEach(notification => {
        notification.read = true;
      });
      this.saveToStorage();
      
      userNotifications.forEach(notification => {
        this.notifyUser(userId, notification);
      });
    }
  }

  // Delete a notification
  deleteNotification(notificationId: string, userId: string): void {
    const userNotifications = this.notifications.get(userId);
    if (userNotifications) {
      const index = userNotifications.findIndex(n => n.id === notificationId);
      if (index > -1) {
        const deletedNotification = userNotifications[index];
        userNotifications.splice(index, 1);
        this.saveToStorage();
        this.notifyUser(userId, { ...deletedNotification, read: true });
      }
    }
  }

  // Delete all notifications for a user
  deleteAllNotifications(userId: string): void {
    const userNotifications = this.notifications.get(userId);
    if (userNotifications) {
      userNotifications.forEach(notification => {
        this.notifyUser(userId, { ...notification, read: true });
      });
    }
    
    this.notifications.delete(userId);
    this.saveToStorage();
  }

  // Get unread count
  getUnreadCount(userId: string): number {
    const userNotifications = this.notifications.get(userId) || [];
    return userNotifications.filter(n => !n.read).length;
  }

  // Subscribe to notifications for a specific user
  subscribe(userId: string, listener: (notification: Notification) => void): () => void {
    if (!this.listeners.has(userId)) {
      this.listeners.set(userId, new Set());
    }
    this.listeners.get(userId)!.add(listener);
    
    return () => {
      const userListeners = this.listeners.get(userId);
      if (userListeners) {
        userListeners.delete(listener);
        if (userListeners.size === 0) {
          this.listeners.delete(userId);
        }
      }
    };
  }

  // Get all user IDs (for debugging)
  getUserIds(): string[] {
    return Array.from(this.notifications.keys());
  }

  // Clear all notifications (for testing)
  clearAll(): void {
    this.notifications.clear();
    this.listeners.clear();
    localStorage.removeItem(this.storageKey);
  }
}

export const notificationService = NotificationService.getInstance();