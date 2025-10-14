// src/context/NotificationsContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Notification, notificationService } from '@/services/notificationService';

interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  loading: boolean;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export const NotificationsProvider: React.FC<{ children: React.ReactNode; userId: string }> = ({ 
  children, 
  userId 
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    notificationService.markAsRead(id, userId);
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    notificationService.markAllAsRead(userId);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  useEffect(() => {
    if (!userId) return;

    // Load initial notifications
    const userNotifications = notificationService.getUserNotifications(userId);
    setNotifications(userNotifications);
    setLoading(false);

    // Subscribe to new notifications
    const unsubscribe = notificationService.subscribe((newNotification) => {
      if (newNotification.userId === userId) {
        setNotifications(prev => [newNotification, ...prev]);
      }
    });

    return unsubscribe;
  }, [userId]);

  return (
    <NotificationsContext.Provider value={{
      notifications,
      unreadCount,
      markAsRead,
      markAllAsRead,
      loading
    }}>
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
};