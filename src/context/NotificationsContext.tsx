// src/context/NotificationsContext.tsx
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { notificationService, Notification } from '../services/notificationService';

interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  refreshNotifications: () => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

interface NotificationsProviderProps {
  children: ReactNode;
  userId: string;
}

export const NotificationsProvider: React.FC<NotificationsProviderProps> = ({ 
  children, 
  userId 
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshNotifications = () => {
    const userNotifications = notificationService.getUserNotifications(userId);
    setNotifications(userNotifications);
    setUnreadCount(userNotifications.filter(n => !n.read).length);
  };

  useEffect(() => {
    if (userId) {
      refreshNotifications();

      // 🔥 FIX: Use the new subscribe method with userId
      const unsubscribe = notificationService.subscribe(userId, (newNotification: Notification) => {
        // Add new notification to the list in real-time
        setNotifications(prev => [newNotification, ...prev]);
        setUnreadCount(prev => prev + 1);
      });

      return () => unsubscribe();
    }
  }, [userId]);

  const markAsRead = (notificationId: string) => {
    notificationService.markAsRead(notificationId, userId);
    refreshNotifications(); // Refresh to get updated read status
  };

  const markAllAsRead = () => {
    notificationService.markAllAsRead(userId);
    refreshNotifications(); // Refresh to get updated read status
  };

  return (
    <NotificationsContext.Provider value={{
      notifications,
      unreadCount,
      markAsRead,
      markAllAsRead,
      refreshNotifications
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