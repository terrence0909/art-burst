// src/services/notificationService.ts
export interface Notification {
  id: string;
  type: 'OUTBID' | 'AUCTION_ENDING' | 'AUCTION_WON' | 'NEW_BID' | 'BID_CONFIRMED' | 'PAYMENT_REMINDER';
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
  private listeners: Set<(notification: Notification) => void> = new Set();

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Add notification and broadcast to listeners
  addNotification(notification: Omit<Notification, 'id' | 'createdAt' | 'read'>): void {
    const fullNotification: Notification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      read: false
    };

    // Store in memory (you can replace this with DynamoDB later)
    if (!this.notifications.has(notification.userId)) {
      this.notifications.set(notification.userId, []);
    }
    this.notifications.get(notification.userId)!.unshift(fullNotification);

    // Notify listeners
    this.listeners.forEach(listener => listener(fullNotification));

    console.log('📢 Notification created:', fullNotification);
  }

  // Get notifications for user
  getUserNotifications(userId: string): Notification[] {
    return this.notifications.get(userId) || [];
  }

  // Mark notification as read
  markAsRead(notificationId: string, userId: string): void {
    const userNotifications = this.notifications.get(userId);
    if (userNotifications) {
      const notification = userNotifications.find(n => n.id === notificationId);
      if (notification) {
        notification.read = true;
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
    }
  }

  // Get unread count
  getUnreadCount(userId: string): number {
    const userNotifications = this.notifications.get(userId) || [];
    return userNotifications.filter(n => !n.read).length;
  }

  // Subscribe to new notifications
  subscribe(listener: (notification: Notification) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const notificationService = NotificationService.getInstance();