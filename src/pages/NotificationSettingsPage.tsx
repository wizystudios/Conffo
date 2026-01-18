import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, MessageSquare, Heart, MessageCircle, UserPlus, Users, Volume2, AtSign, Reply, Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/hooks/use-toast';
import { requestNotificationPermission } from '@/utils/pushNotifications';

const NOTIFICATION_SETTINGS_KEY = 'notification_settings';

export interface NotificationSettings {
  messages: boolean;
  likes: boolean;
  comments: boolean;
  follows: boolean;
  communities: boolean;
  communitySound: boolean;
  mentions: boolean;
  replies: boolean;
  reactions: boolean;
}

const defaultSettings: NotificationSettings = {
  messages: true,
  likes: true,
  comments: true,
  follows: true,
  communities: true,
  communitySound: true,
  mentions: true,
  replies: true,
  reactions: true,
};

export function getNotificationSettings(): NotificationSettings {
  try {
    const stored = localStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    return stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings;
  } catch {
    return defaultSettings;
  }
}

export function saveNotificationSettings(settings: NotificationSettings): void {
  localStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings));
}

export default function NotificationSettingsPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [settings, setSettings] = useState<NotificationSettings>(getNotificationSettings());

  useEffect(() => {
    setSettings(getNotificationSettings());
  }, []);

  const handleToggle = async (key: keyof NotificationSettings) => {
    const newValue = !settings[key];
    const newSettings = { ...settings, [key]: newValue };
    setSettings(newSettings);
    saveNotificationSettings(newSettings);

    // Request browser notification permission when community notifications are enabled
    if (key === 'communities' && newValue) {
      try {
        const granted = await requestNotificationPermission();
        if (!granted) {
          toast({
            description: "Please allow notifications in your browser settings",
            variant: "destructive"
          });
        }
      } catch {
        // Permission request failed silently
      }
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <Bell className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground mb-4">Please log in to manage notification settings.</p>
        <Button onClick={() => navigate('/auth')}>Login</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-base font-semibold">Notification Settings</h1>
        </div>
      </div>

      <div className="p-4 space-y-6">
        <p className="text-sm text-muted-foreground">
          Control which notifications you receive in the app.
        </p>

        <div className="space-y-4">
          {/* Messages */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-border">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <Label htmlFor="messages" className="font-medium">Messages</Label>
                <p className="text-xs text-muted-foreground">When someone sends you a message</p>
              </div>
            </div>
            <Switch
              id="messages"
              checked={settings.messages}
              onCheckedChange={() => handleToggle('messages')}
            />
          </div>

          {/* Mentions */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-border">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-cyan-500/10 flex items-center justify-center">
                <AtSign className="h-5 w-5 text-cyan-500" />
              </div>
              <div>
                <Label htmlFor="mentions" className="font-medium">Mentions</Label>
                <p className="text-xs text-muted-foreground">When someone @mentions you</p>
              </div>
            </div>
            <Switch
              id="mentions"
              checked={settings.mentions}
              onCheckedChange={() => handleToggle('mentions')}
            />
          </div>

          {/* Replies */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-border">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-indigo-500/10 flex items-center justify-center">
                <Reply className="h-5 w-5 text-indigo-500" />
              </div>
              <div>
                <Label htmlFor="replies" className="font-medium">Replies</Label>
                <p className="text-xs text-muted-foreground">When someone replies to your message</p>
              </div>
            </div>
            <Switch
              id="replies"
              checked={settings.replies}
              onCheckedChange={() => handleToggle('replies')}
            />
          </div>

          {/* Reactions */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-border">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <Smile className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <Label htmlFor="reactions" className="font-medium">Reactions</Label>
                <p className="text-xs text-muted-foreground">When someone reacts to your post or message</p>
              </div>
            </div>
            <Switch
              id="reactions"
              checked={settings.reactions}
              onCheckedChange={() => handleToggle('reactions')}
            />
          </div>

          {/* Likes */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-border">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-pink-500/10 flex items-center justify-center">
                <Heart className="h-5 w-5 text-pink-500" />
              </div>
              <div>
                <Label htmlFor="likes" className="font-medium">Likes</Label>
                <p className="text-xs text-muted-foreground">When someone likes your confession</p>
              </div>
            </div>
            <Switch
              id="likes"
              checked={settings.likes}
              onCheckedChange={() => handleToggle('likes')}
            />
          </div>

          {/* Comments */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-border">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <Label htmlFor="comments" className="font-medium">Comments</Label>
                <p className="text-xs text-muted-foreground">When someone comments on your confession</p>
              </div>
            </div>
            <Switch
              id="comments"
              checked={settings.comments}
              onCheckedChange={() => handleToggle('comments')}
            />
          </div>

          {/* Follows */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-border">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                <UserPlus className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <Label htmlFor="follows" className="font-medium">Follows</Label>
                <p className="text-xs text-muted-foreground">When someone follows you</p>
              </div>
            </div>
            <Switch
              id="follows"
              checked={settings.follows}
              onCheckedChange={() => handleToggle('follows')}
            />
          </div>

          {/* Community Notifications */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-border">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <Label htmlFor="communities" className="font-medium">Communities</Label>
                <p className="text-xs text-muted-foreground">When new messages arrive in your communities</p>
              </div>
            </div>
            <Switch
              id="communities"
              checked={settings.communities}
              onCheckedChange={() => handleToggle('communities')}
            />
          </div>

          {/* Community Sound */}
          {settings.communities && (
            <div className="flex items-center justify-between p-4 rounded-xl border border-border ml-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-orange-500/5 flex items-center justify-center">
                  <Volume2 className="h-5 w-5 text-orange-400" />
                </div>
                <div>
                  <Label htmlFor="communitySound" className="font-medium">Sound</Label>
                  <p className="text-xs text-muted-foreground">Play sound for community messages</p>
                </div>
              </div>
              <Switch
                id="communitySound"
                checked={settings.communitySound}
                onCheckedChange={() => handleToggle('communitySound')}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}