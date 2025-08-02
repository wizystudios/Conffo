import { useState, useRef, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Bell, Check, Trash2, ArrowLeft } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { markAllNotificationsAsRead, getUserNotifications, deleteNotification, getNotificationSender } from '@/utils/notificationUtils';
import { UsernameDisplay } from '@/components/UsernameDisplay';

export default function NotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Fetch notifications
  const { data: notifications = [], refetch: refetchNotifications } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const notifs = await getUserNotifications(user.id, false);
      
      // Enhance with sender info if available
      const enhancedNotifs = await Promise.all(notifs.map(async (notification) => {
        const senderInfo = await getNotificationSender(notification);
        return {
          ...notification,
          senderInfo
        };
      }));
      
      return enhancedNotifs;
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  });
  
  useEffect(() => {
    // Add fall-down animation from top
    if (containerRef.current) {
      containerRef.current.style.transform = 'translateY(-100%)';
      containerRef.current.style.opacity = '0';
      
      requestAnimationFrame(() => {
        if (containerRef.current) {
          containerRef.current.style.transition = 'all 0.6s cubic-bezier(0.4, 0.0, 0.2, 1)';
          containerRef.current.style.transform = 'translateY(0)';
          containerRef.current.style.opacity = '1';
        }
      });
    }
  }, []);
  
  const unreadNotificationsCount = notifications.filter(n => !n.is_read).length;
  
  const handleMarkNotificationsAsRead = async () => {
    if (!user?.id || unreadNotificationsCount === 0) return;
    
    await markAllNotificationsAsRead(user.id);
    toast({
      description: "All notifications marked as read"
    });
    
    refetchNotifications();
  };

  const handleDeleteSelectedNotifications = async () => {
    if (selectedNotifications.length === 0) return;
    
    for (const notificationId of selectedNotifications) {
      await deleteNotification(notificationId);
    }
    
    toast({
      description: `Deleted ${selectedNotifications.length} notification${selectedNotifications.length > 1 ? 's' : ''}`
    });
    
    setSelectedNotifications([]);
    refetchNotifications();
  };

  const toggleNotificationSelection = (id: string) => {
    setSelectedNotifications(prev => 
      prev.includes(id) 
        ? prev.filter(notifId => notifId !== id)
        : [...prev, id]
    );
  };
  
  const handleDeleteAllNotifications = async () => {
    if (!user?.id || notifications.length === 0) return;
    
    for (const notification of notifications) {
      await deleteNotification(notification.id);
    }
    
    toast({
      description: "All notifications cleared"
    });
    
    refetchNotifications();
  };

  return (
    <Layout>
      <div ref={containerRef} className="min-h-screen">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="max-w-lg mx-auto px-4 py-4">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate(-1)}
                className="rounded-full"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              
              <div className="flex items-center gap-2 flex-1">
                <Bell className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-bold">Notifications</h1>
                {unreadNotificationsCount > 0 && (
                  <Badge className="h-5 min-w-5 px-1.5 text-xs">
                    {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-1">
                {notifications.length > 0 && (
                  <>
                    {unreadNotificationsCount > 0 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={handleMarkNotificationsAsRead}
                        className="h-8 px-2 text-xs"
                      >
                        <Check className="h-3.5 w-3.5 mr-1" />
                        Mark all read
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleDeleteAllNotifications}
                      className="h-8 px-2 text-xs"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Clear all
                    </Button>
                  </>
                )}
              </div>
            </div>
            
            {selectedNotifications.length > 0 && (
              <div className="flex justify-between items-center mt-3 pt-3 border-t">
                <span className="text-sm text-muted-foreground">
                  {selectedNotifications.length} selected
                </span>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={handleDeleteSelectedNotifications}
                  className="h-7 text-xs"
                >
                  Delete selected
                </Button>
              </div>
            )}
          </div>
        </div>
        
        {/* Content */}
        <div className="max-w-lg mx-auto">
          {notifications.length > 0 ? (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div 
                  key={notification.id} 
                  className={`p-4 hover:bg-muted/50 relative ${!notification.is_read ? 'bg-primary/5' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 pt-1">
                      <Checkbox 
                        checked={selectedNotifications.includes(notification.id)}
                        onCheckedChange={() => toggleNotificationSelection(notification.id)}
                      />
                    </div>
                    <div className="flex-grow min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-grow min-w-0">
                          {notification.senderInfo?.username && (
                            <div className="mb-2">
                              <UsernameDisplay
                                userId={notification.senderInfo.userId}
                                showAvatar={true}
                                size="sm"
                              />
                            </div>
                          )}
                          <p className="text-sm break-words line-clamp-3">
                            {notification.content.replace('Someone', notification.senderInfo?.username || 'Someone')}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                            </p>
                            {!notification.is_read && (
                              <span className="w-2 h-2 rounded-full bg-primary"></span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <Bell className="h-12 w-12 text-muted-foreground mb-4" />
              <h2 className="text-lg font-semibold mb-2">No notifications yet</h2>
              <p className="text-sm text-muted-foreground text-center">
                When you get likes, comments, or follows, they'll appear here.
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}