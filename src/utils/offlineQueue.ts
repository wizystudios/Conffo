import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface QueuedPost {
  id: string;
  type: 'confession' | 'comment';
  data: any;
  timestamp: number;
}

const QUEUE_KEY = 'offline_post_queue';

export const offlineQueue = {
  add: (type: 'confession' | 'comment', data: any) => {
    const queue = offlineQueue.getQueue();
    const queuedPost: QueuedPost = {
      id: crypto.randomUUID(),
      type,
      data,
      timestamp: Date.now()
    };
    queue.push(queuedPost);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    
    toast({
      description: '📡 Saved offline. Will upload when online.',
      duration: 2000
    });
  },

  getQueue: (): QueuedPost[] => {
    try {
      const queue = localStorage.getItem(QUEUE_KEY);
      return queue ? JSON.parse(queue) : [];
    } catch {
      return [];
    }
  },

  remove: (id: string) => {
    const queue = offlineQueue.getQueue().filter(item => item.id !== id);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  },

  clear: () => {
    localStorage.setItem(QUEUE_KEY, JSON.stringify([]));
  },

  getPendingCount: (): number => {
    return offlineQueue.getQueue().length;
  },

  uploadQueue: async () => {
    const queue = offlineQueue.getQueue();
    if (queue.length === 0) return;

    let successCount = 0;
    let failedItems: QueuedPost[] = [];

    for (const item of queue) {
      try {
        if (item.type === 'confession') {
          await supabase.from('confessions').insert(item.data);
        } else if (item.type === 'comment') {
          await supabase.from('comments').insert(item.data);
        }
        successCount++;
        offlineQueue.remove(item.id);
      } catch (error) {
        console.error('Failed to upload queued item:', error);
        failedItems.push(item);
      }
    }

    if (successCount > 0) {
      toast({
        description: `✅ Uploaded ${successCount} queued ${successCount === 1 ? 'post' : 'posts'}!`,
        duration: 3000
      });
    }

    if (failedItems.length > 0) {
      toast({
        description: `⚠️ ${failedItems.length} ${failedItems.length === 1 ? 'post' : 'posts'} failed to upload`,
        variant: 'destructive',
        duration: 3000
      });
    }
  }
};

// Monitor online/offline status
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('Back online! Uploading queued posts...');
    offlineQueue.uploadQueue();
  });

  window.addEventListener('offline', () => {
    console.log('Offline mode activated');
    toast({
      description: '📡 You\'re offline. Posts will queue for later.',
      duration: 2000
    });
  });
}
