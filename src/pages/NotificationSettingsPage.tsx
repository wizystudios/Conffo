import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, MessageSquare, Heart, MessageCircle, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';

const NOTIFICATION_SETTINGS_KEY = 'notification_settings';

interface NotificationSettings {
  messages: boolean;
  likes: boolean;
  comments: boolean;
  follows: boolean;
}

const defaultSettings: NotificationSettings = {
  messages: true,
  likes: true,
  comments: true,
  follows: true,
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

  const handleToggle = (key: keyof NotificationSettings) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings);
    saveNotificationSettings(newSettings);
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
        </div>
      </div>
    </div>
  );
}