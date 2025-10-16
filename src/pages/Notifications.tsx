import { useEffect, useState } from "react";
import { Bell, CheckCircle, XCircle, Info, AlertCircle, Trophy, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { Badge } from "@/components/ui/badge";

interface Notification {
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

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        console.log('🔍 STEP 1: Loading notification service...');
        
        const module = await import('@/services/notificationService');
        const service = module.notificationService;
        
        console.log('✅ Service instance:', service);
        console.log('📋 Service methods:', Object.keys(service));
        
        const userId = localStorage.getItem('auction-user-id');
        console.log('👤 User ID:', userId);
        
        if (userId) {
          // Check service internal state
          console.log('📊 Service user IDs:', service.getUserIds());
          
          // Get notifications directly from service
          const userNotifications = service.getUserNotifications(userId);
          console.log('📬 Notifications from service:', userNotifications);
          console.log('🔢 Number of notifications:', userNotifications.length);
          
          // Check if it's an array and has the right structure
          console.log('📐 Is array?', Array.isArray(userNotifications));
          if (userNotifications.length > 0) {
            console.log('📄 First notification structure:', userNotifications[0]);
          }
          
          setNotifications(userNotifications);
          
          // Force a re-render to see if React state is the issue
          setTimeout(() => {
            console.log('🔄 After setNotifications - state should be updated');
          }, 100);
        }
      } catch (error) {
        console.error('💥 Error:', error);
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();
  }, []);

  const markAsRead = async (notificationId: string) => {
    try {
      const service = await import('@/services/notificationService').then(m => m.notificationService);
      const userId = localStorage.getItem('auction-user-id');
      if (userId) {
        service.markAsRead(notificationId, userId);
        setNotifications(prev => prev.map(n => 
          n.id === notificationId ? { ...n, read: true } : n
        ));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const service = await import('@/services/notificationService').then(m => m.notificationService);
      const userId = localStorage.getItem('auction-user-id');
      if (userId) {
        service.markAllAsRead(userId);
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'OUTBID': return <XCircle className="w-5 h-5 text-destructive" />;
      case 'AUCTION_ENDING': return <AlertCircle className="w-5 h-5 text-gold" />;
      case 'AUCTION_WON': return <Trophy className="w-5 h-5 text-green-600 dark:text-green-400" />;
      case 'NEW_BID': return <Bell className="w-5 h-5 text-blue-500" />;
      case 'BID_CONFIRMED': return <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />;
      case 'PAYMENT_REMINDER': return <CreditCard className="w-5 h-5 text-orange-500" />;
      default: return <Info className="w-5 h-5 text-primary" />;
    }
  };

  // Add debug logging for rendering
  console.log('🔄 Component rendering with notifications:', notifications.length);
  console.log('📝 Notifications data:', notifications);

  const unreadCount = notifications.filter(n => !n.read).length;
  console.log('🔢 Unread count:', unreadCount);

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-background">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center text-muted-foreground">Loading notifications...</div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-playfair text-4xl font-bold text-foreground mb-2">
                Notifications
              </h1>
              <div className="flex items-center space-x-2">
                <p className="text-muted-foreground">
                  {unreadCount} unread {unreadCount === 1 ? 'notification' : 'notifications'}
                </p>
                {unreadCount > 0 && (
                  <Badge className="bg-primary text-primary-foreground">
                    {unreadCount}
                  </Badge>
                )}
              </div>
            </div>
            {unreadCount > 0 && (
              <Button onClick={markAllAsRead} variant="outline" className="border-primary/20">
                Mark all as read
              </Button>
            )}
          </div>

          <Card className="border-border shadow-elegant">
            <CardHeader className="border-b border-border">
              <CardTitle className="font-playfair text-2xl">Your Notifications</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {notifications.length === 0 ? (
                <div className="text-center py-16 px-4">
                  <Bell className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-30" />
                  <p className="text-muted-foreground text-lg">No notifications yet</p>
                  <p className="text-muted-foreground text-sm mt-2">
                    We'll notify you when something important happens
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-6 flex items-start space-x-4 transition-colors hover:bg-muted/30 ${
                        !notification.read ? 'bg-primary/5 border-l-4 border-l-primary' : ''
                      }`}
                    >
                      <div className="mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <h3 className="font-semibold text-foreground text-lg">
                            {notification.title}
                          </h3>
                          <span className="text-sm text-muted-foreground whitespace-nowrap">
                            {new Date(notification.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                        <p className="text-muted-foreground">{notification.message}</p>
                      </div>
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsRead(notification.id)}
                          className="shrink-0 hover:bg-primary/10"
                        >
                          Mark read
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}