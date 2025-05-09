
export type Room = 
  | 'relationships'
  | 'school'
  | 'work'
  | 'family'
  | 'friends'
  | 'random';

export type Reaction = 'like' | 'laugh' | 'shock' | 'heart';

export interface User {
  id: string;
  username: string | null;
  isAdmin?: boolean;
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
  reason: string;
  userId: string;
  timestamp: number;
  resolved: boolean;
}
