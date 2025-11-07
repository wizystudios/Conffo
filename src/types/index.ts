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
  isPublic?: boolean;
  hasActiveStory?: boolean; // Added to indicate if user has an active story
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
  mediaUrls?: string[];
  mediaType?: 'image' | 'video' | 'audio';
  mediaTypes?: ('image' | 'video' | 'audio')[];
  tags?: string[];
}

// Added Story interface
export interface Story {
  id: string;
  userId: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption?: string;
  effects?: StoryEffects;
  createdAt: number;
  expiresAt: number;
  isViewed?: boolean;
}

// Added StoryEffects interface
export interface StoryEffects {
  filters?: {
    brightness?: number;
    contrast?: number;
    saturation?: number;
    blur?: number;
  };
  text?: StoryText[];
  stickers?: StorySticker[];
  beautyMode?: boolean;
}

export interface StoryText {
  id: string;
  content: string;
  position: { x: number; y: number };
  style?: {
    fontSize?: number;
    color?: string;
    fontFamily?: string;
    isBold?: boolean;
    isItalic?: boolean;
  };
}

export interface StorySticker {
  id: string;
  type: string;
  position: { x: number; y: number };
  scale?: number;
  rotation?: number;
}

export interface Comment {
  id: string;
  confessionId: string;
  userId: string;
  content: string;
  timestamp: Date | number;
  parentCommentId?: string;
  replies?: Comment[];
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
