import { useEffect, useState } from "react";
import { Bell, CheckCircle, XCircle, Info, AlertCircle, Trophy, CreditCard, Trash2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/Header";
import { useNavigate } from "react-router-dom";
import { Notification, notificationService } from "@/services/notificationService";

export default function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  // Load real notifications - FIXED VERSION
  useEffect(() => {
    const userId = localStorage.getItem('auction-user-id');
    if (!userId) {
      setLoading(false);
      return;
    }

    // Load initial notifications
    const userNotifications = notificationService.getUserNotifications(userId);
    setNotifications(userNotifications);
    setLoading(false);

    // Subscribe to real-time notifications
    const unsubscribe = notificationService.subscribe(userId, (newNotification) => {
      setNotifications(prev => {
        // Check if this notification already exists to avoid duplicates
        const exists = prev.find(n => n.id === newNotification.id);
        if (exists) {
          // Update existing notification
          return prev.map(n => n.id === newNotification.id ? newNotification : n);
        } else {
          // Add new notification at the top
          return [newNotification, ...prev];
        }
      });
    });

    return unsubscribe;
  }, []);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'OUTBID': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'AUCTION_ENDING': return <AlertCircle className="w-4 h-4 text-amber-500" />;
      case 'AUCTION_WON': return <Trophy className="w-4 h-4 text-green-500" />;
      case 'NEW_BID': return <Bell className="w-4 h-4 text-blue-500" />;
      case 'BID_CONFIRMED': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'PAYMENT_REMINDER': return <CreditCard className="w-4 h-4 text-orange-500" />;
      case 'AUCTION_SOLD': return <Trophy className="w-4 h-4 text-purple-500" />;
      default: return <Info className="w-4 h-4 text-slate-500" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'AUCTION_WON': return 'bg-green-50 dark:bg-green-950/20 border-l-green-500';
      case 'OUTBID': return 'bg-red-50 dark:bg-red-950/20 border-l-red-500';
      case 'AUCTION_ENDING': return 'bg-amber-50 dark:bg-amber-950/20 border-l-amber-500';
      case 'BID_CONFIRMED': return 'bg-green-50 dark:bg-green-950/20 border-l-green-500';
      case 'PAYMENT_REMINDER': return 'bg-orange-50 dark:bg-orange-950/20 border-l-orange-500';
      case 'NEW_BID': return 'bg-blue-50 dark:bg-blue-950/20 border-l-blue-500';
      case 'AUCTION_SOLD': return 'bg-purple-50 dark:bg-purple-950/20 border-l-purple-500';
      default: return 'bg-slate-50 dark:bg-slate-950/20 border-l-slate-500';
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const userId = localStorage.getItem('auction-user-id');
      if (userId) {
        notificationService.markAsRead(notificationId, userId);
        // The subscription will handle the state update
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const userId = localStorage.getItem('auction-user-id');
      if (userId) {
        notificationService.deleteNotification(notificationId, userId);
        // The subscription will handle the state update
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const userId = localStorage.getItem('auction-user-id');
      if (userId) {
        notificationService.markAllAsRead(userId);
        // The subscription will handle the state update
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const displayNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.read)
    : notifications;

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto"></div>
            <p className="text-gray-700 mt-4">Loading notifications...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-gray-300 to-gray-500">
        <div className="container px-4 py-6 md:py-8 max-w-3xl">
          {/* Header with Back Button */}
          <div className="mb-6 md:mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-gray-800 hover:text-gray-900 backdrop-blur-xl bg-white/20 border border-white/30"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            </div>
            
            <Card className="backdrop-blur-xl bg-white/20 border border-white/30 rounded-xl shadow-xl p-6">
              <CardContent className="p-0">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-lg flex items-center justify-center border border-white/20">
                      <Bell className="w-6 h-6 text-gradient" />
                    </div>
                    <div>
                      <h1 className="font-playfair text-2xl md:text-3xl font-bold text-gray-800">
                        Notifications
                      </h1>
                      <p className="text-sm text-gray-700 mt-1">
                        {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
                      </p>
                    </div>
                  </div>
                  {unreadCount > 0 && (
                    <Badge className="bg-primary/20 text-primary border-0 text-xs">
                      {unreadCount}
                    </Badge>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 flex-wrap mt-4">
                  <Button 
                    variant={filter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('all')}
                    className="text-xs backdrop-blur-xl bg-white/20 border border-white/30"
                  >
                    All ({notifications.length})
                  </Button>
                  <Button 
                    variant={filter === 'unread' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('unread')}
                    className="text-xs backdrop-blur-xl bg-white/20 border border-white/30"
                  >
                    Unread ({unreadCount})
                  </Button>
                  {unreadCount > 0 && (
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={markAllAsRead}
                      className="text-xs ml-auto backdrop-blur-xl bg-white/20 border border-white/30"
                    >
                      Mark all as read
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Notifications List */}
          <div className="space-y-3">
            {displayNotifications.length === 0 ? (
              <Card className="backdrop-blur-xl bg-white/20 border border-white/30 rounded-xl shadow-xl border-dashed py-12 flex flex-col items-center justify-center">
                <CardContent className="p-0 text-center">
                  <div className="p-3 rounded-lg bg-white/20 mb-3 border border-white/20">
                    <Bell className="w-8 h-8 text-gray-600" />
                  </div>
                  <p className="text-gray-700 font-medium">No notifications</p>
                  <p className="text-xs text-gray-600 mt-1">
                    {filter === 'unread' ? 'All caught up!' : 'Check back later'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              displayNotifications.map((notification) => (
                <Card 
                  key={notification.id}
                  className={`group hover:shadow-2xl transition-all duration-300 backdrop-blur-xl bg-white/20 border border-white/30 rounded-xl shadow-xl ${
                    !notification.read ? 'border-primary/30 bg-primary/5' : getNotificationColor(notification.type)
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className="w-10 h-10 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-lg flex items-center justify-center border border-white/20 group-hover:scale-110 transition-transform duration-300">
                        {getNotificationIcon(notification.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="font-semibold text-sm text-gray-800 truncate">
                            {notification.title}
                          </h3>
                          <span className="text-xs text-gray-600 shrink-0 whitespace-nowrap">
                            {new Date(notification.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <p className="text-xs md:text-sm text-gray-700 line-clamp-2">
                          {notification.message}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAsRead(notification.id)}
                            className="h-7 px-2 text-xs backdrop-blur-xl bg-white/20 border border-white/30"
                            title="Mark as read"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteNotification(notification.id)}
                          className="h-7 px-2 text-xs text-gray-600 hover:text-destructive backdrop-blur-xl bg-white/20 border border-white/30"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}