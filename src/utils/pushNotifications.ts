// Browser Push Notifications Utility

let notificationPermission: NotificationPermission = 'default';

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    notificationPermission = 'granted';
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    notificationPermission = permission;
    return permission === 'granted';
  }

  return false;
}

export function showNotification(
  title: string,
  options?: {
    body?: string;
    icon?: string;
    tag?: string;
    onClick?: () => void;
  }
): void {
  if (notificationPermission !== 'granted' && Notification.permission !== 'granted') {
    console.log('Notification permission not granted');
    return;
  }

  // Don't show notification if page is visible
  if (document.visibilityState === 'visible') {
    return;
  }

  try {
    const notification = new Notification(title, {
      body: options?.body,
      icon: options?.icon || '/lovable-uploads/ce53fd65-dc4f-4335-984b-567f5fbae96d.png',
      tag: options?.tag,
      requireInteraction: false,
      silent: false,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
      options?.onClick?.();
    };

    // Auto close after 5 seconds
    setTimeout(() => notification.close(), 5000);
  } catch (error) {
    console.error('Error showing notification:', error);
  }
}

export function showMessageNotification(
  senderName: string,
  messageContent: string,
  senderId: string
): void {
  showNotification(`New message from ${senderName}`, {
    body: messageContent.length > 50 ? messageContent.slice(0, 50) + '...' : messageContent,
    tag: `message-${senderId}`,
    onClick: () => {
      window.location.href = `/chat/${senderId}`;
    }
  });
}

export function showCommentNotification(
  commenterName: string,
  postContent: string,
  postId: string
): void {
  showNotification(`${commenterName} commented on your post`, {
    body: postContent.length > 40 ? postContent.slice(0, 40) + '...' : postContent,
    tag: `comment-${postId}`,
    onClick: () => {
      window.location.href = `/confession/${postId}`;
    }
  });
}

export function showLikeNotification(
  likerName: string,
  postContent: string,
  postId: string
): void {
  showNotification(`${likerName} liked your post`, {
    body: postContent.length > 40 ? postContent.slice(0, 40) + '...' : postContent,
    tag: `like-${postId}`,
    onClick: () => {
      window.location.href = `/confession/${postId}`;
    }
  });
}

export function showFollowNotification(
  followerName: string,
  followerId: string
): void {
  showNotification(`${followerName} started following you`, {
    body: 'Tap to view their profile',
    tag: `follow-${followerId}`,
    onClick: () => {
      window.location.href = `/user/${followerId}`;
    }
  });
}