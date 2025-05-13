
export type Room = 
  | 'relationships'
  | 'school'
  | 'work'
  | 'family'
  | 'friends'
  | 'random';

export type Reaction = 'like' | 'laugh' | 'shock' | 'heart';

export type ReportReason = 'offensive' | 'spam' | 'harassment' | 'inappropriate' | 'other';

export interface User {
  id: string;
  username: string | null;
  isAdmin: boolean;
  isModerator: boolean;
  savedConfessions?: string[];
  bio?: string | null;
  avatarUrl?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  isPublic?: boolean; // Add isPublic field
}

export interface Confession {
  id: string;
  content: string;
  room: Room;
  userId: string;
  timestamp: number;
  reactions: {
    like: number;
    laugh: number;
    shock: number;
    heart: number;
  };
  commentCount: number;
  userReactions?: Reaction[];
  mediaUrl?: string | null;
  mediaType?: 'image' | 'video';
  tags?: string[];
}

export interface Comment {
  id: string;
  confessionId: string;
  userId: string;
  content: string;
  timestamp: number;
}

export interface Report {
  id: string;
  type: 'confession' | 'comment';
  itemId: string;
  reason: ReportReason;
  details?: string;
  userId: string;
  timestamp: number;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: number;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  content: string;
  relatedId?: string;
  isRead: boolean;
  timestamp: number;
}

export interface RoomFollow {
  id: string;
  roomId: Room;
  userId: string;
  timestamp: number;
}

export interface UserActivityLog {
  id: string;
  userId?: string;
  activityType: string;
  details?: any;
  ipAddress?: string;
  timestamp: number;
}

export interface RoomInfo {
  id: Room;
  name: string;
  description: string;
  isPinned?: boolean;
}
