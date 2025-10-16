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

    // 🔥 NOTIFY THE SPECIFIC USER in real-time
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
        this.saveToStorage(); // Save changes
        this.notifyUser(userId, notification); // Notify of update
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
      this.saveToStorage(); // Save changes
      
      // Notify that all notifications were updated
      userNotifications.forEach(notification => {
        this.notifyUser(userId, notification);
      });
    }
  }

  // Get unread count
  getUnreadCount(userId: string): number {
    const userNotifications = this.notifications.get(userId) || [];
    return userNotifications.filter(n => !n.read).length;
  }

  // 🔥 NEW: Subscribe to notifications for a specific user
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

  // 🔥 NEW: Get all user IDs (for debugging)
  getUserIds(): string[] {
    return Array.from(this.notifications.keys());
  }

  // 🔥 NEW: Clear all notifications (for testing)
  clearAll(): void {
    this.notifications.clear();
    this.listeners.clear();
    localStorage.removeItem(this.storageKey);
  }
}

export const notificationService = NotificationService.getInstance();