import { v4 as uuidv4 } from 'uuid';
import { Confession, Comment, Room, Reaction, Report, ReportReason } from '@/types';

// Mock data storage - in a real app, this would be replaced with API calls
let confessions: Confession[] = [];
let comments: Comment[] = [];
let reports: Report[] = [];

// Initialize with some sample confessions
const initializeData = () => {
  const storedConfessions = localStorage.getItem('confessions');
  const storedComments = localStorage.getItem('comments');
  const storedReports = localStorage.getItem('reports');

  if (storedConfessions) {
    confessions = JSON.parse(storedConfessions);
  } else {
    // Sample confessions if none exist
    confessions = [
      {
        id: uuidv4(),
        content: "I secretly hate my job but pretend to love it around my coworkers.",
        room: 'work',
        userId: 'system',
        timestamp: Date.now() - 3600000,
        reactions: { like: 24, laugh: 5, shock: 12, heart: 3 },
        commentCount: 2
      },
      {
        id: uuidv4(),
        content: "I've been pretending to understand calculus all semester but I'm completely lost.",
        room: 'school',
        userId: 'system',
        timestamp: Date.now() - 7200000,
        reactions: { like: 45, laugh: 28, shock: 7, heart: 2 },
        commentCount: 5
      },
      {
        id: uuidv4(),
        content: "I still sleep with my childhood teddy bear. I'm 27.",
        room: 'random',
        userId: 'system',
        timestamp: Date.now() - 10800000,
        reactions: { like: 62, laugh: 13, shock: 0, heart: 41 },
        commentCount: 8
      },
      {
        id: uuidv4(),
        content: "I've been in love with my best friend for years but never told them.",
        room: 'relationships',
        userId: 'system',
        timestamp: Date.now() - 14400000,
        reactions: { like: 89, laugh: 2, shock: 14, heart: 59 },
        commentCount: 12
      },
      {
        id: uuidv4(),
        content: "I intentionally mess up household chores so my partner will stop asking me to do them.",
        room: 'family',
        userId: 'system',
        timestamp: Date.now() - 18000000,
        reactions: { like: 33, laugh: 47, shock: 8, heart: 1 },
        commentCount: 6
      }
    ];
    
    saveConfessions();
  }

  if (storedComments) {
    comments = JSON.parse(storedComments);
  } else {
    // Sample comments if none exist
    comments = [
      {
        id: uuidv4(),
        confessionId: confessions[0].id,
        userId: 'system',
        content: "I feel the same way about my job!",
        timestamp: Date.now() - 1800000
      },
      {
        id: uuidv4(),
        confessionId: confessions[0].id,
        userId: 'system',
        content: "Maybe it's time for a career change?",
        timestamp: Date.now() - 900000
      }
    ];
    
    saveComments();
  }

  if (storedReports) {
    reports = JSON.parse(storedReports);
  }
};

const saveConfessions = () => {
  localStorage.setItem('confessions', JSON.stringify(confessions));
};

const saveComments = () => {
  localStorage.setItem('comments', JSON.stringify(comments));
};

const saveReports = () => {
  localStorage.setItem('reports', JSON.stringify(reports));
};

// Confessions
export const getConfessions = (room?: Room, userId?: string) => {
  let filteredConfessions = [...confessions];
  
  if (room) {
    filteredConfessions = filteredConfessions.filter(c => c.room === room);
  }
  
  // If userId is provided, add user's reactions to each confession
  if (userId) {
    filteredConfessions = filteredConfessions.map(confession => {
      const userReactions: Reaction[] = [];
      
      // Check local storage for user reactions
      const reactionKey = `reaction_${userId}_${confession.id}`;
      const storedReactions = localStorage.getItem(reactionKey);
      
      if (storedReactions) {
        const parsedReactions = JSON.parse(storedReactions);
        Object.entries(parsedReactions).forEach(([reaction, hasReacted]) => {
          if (hasReacted) {
            userReactions.push(reaction as Reaction);
          }
        });
      }
      
      return {
        ...confession,
        userReactions
      };
    });
  }
  
  // Sort by timestamp (newest first)
  return filteredConfessions.sort((a, b) => b.timestamp - a.timestamp);
};

export const getTrendingConfessions = (limit = 5) => {
  // For trending, we'll just use total reactions as a simple metric
  return [...confessions]
    .map(confession => {
      const totalReactions = 
        confession.reactions.like +
        confession.reactions.laugh + 
        confession.reactions.shock +
        confession.reactions.heart;
      return { ...confession, totalReactions };
    })
    .sort((a, b) => b.totalReactions - a.totalReactions)
    .slice(0, limit);
};

export const getConfessionById = (id: string, userId?: string) => {
  const confession = confessions.find(c => c.id === id);
  
  if (!confession) return null;
  
  // If userId is provided, add user's reactions
  if (userId) {
    const userReactions: Reaction[] = [];
    const reactionKey = `reaction_${userId}_${confession.id}`;
    const storedReactions = localStorage.getItem(reactionKey);
    
    if (storedReactions) {
      const parsedReactions = JSON.parse(storedReactions);
      Object.entries(parsedReactions).forEach(([reaction, hasReacted]) => {
        if (hasReacted) {
          userReactions.push(reaction as Reaction);
        }
      });
    }
    
    return {
      ...confession,
      userReactions
    };
  }
  
  return confession;
};

export const addConfession = (content: string, room: Room, userId: string) => {
  const newConfession: Confession = {
    id: uuidv4(),
    content,
    room,
    userId,
    timestamp: Date.now(),
    reactions: { like: 0, laugh: 0, shock: 0, heart: 0 },
    commentCount: 0
  };
  
  confessions.push(newConfession);
  saveConfessions();
  return newConfession;
};

export const deleteConfession = (id: string) => {
  confessions = confessions.filter(c => c.id !== id);
  // Also delete related comments
  comments = comments.filter(c => c.confessionId !== id);
  saveConfessions();
  saveComments();
};

// Comments
export const getCommentsByConfessionId = (confessionId: string) => {
  return comments
    .filter(c => c.confessionId === confessionId)
    .sort((a, b) => {
      const timeA = typeof a.timestamp === 'number' ? a.timestamp : a.timestamp.getTime();
      const timeB = typeof b.timestamp === 'number' ? b.timestamp : b.timestamp.getTime();
      return timeB - timeA;
    });
};

export const addComment = (content: string, confessionId: string, userId: string) => {
  const newComment: Comment = {
    id: uuidv4(),
    confessionId,
    userId,
    content,
    timestamp: Date.now()
  };
  
  comments.push(newComment);
  
  // Update comment count
  const confession = confessions.find(c => c.id === confessionId);
  if (confession) {
    confession.commentCount++;
    saveConfessions();
  }
  
  saveComments();
  return newComment;
};

export const deleteComment = (id: string) => {
  const comment = comments.find(c => c.id === id);
  if (!comment) return;
  
  comments = comments.filter(c => c.id !== id);
  
  // Update comment count
  const confession = confessions.find(c => c.id === comment.confessionId);
  if (confession && confession.commentCount > 0) {
    confession.commentCount--;
    saveConfessions();
  }
  
  saveComments();
};

// Reactions
export const toggleReaction = (confessionId: string, userId: string, reaction: Reaction) => {
  const confession = confessions.find(c => c.id === confessionId);
  if (!confession) return;
  
  const reactionKey = `reaction_${userId}_${confessionId}`;
  let userReactions = {};
  
  const storedReactions = localStorage.getItem(reactionKey);
  if (storedReactions) {
    userReactions = JSON.parse(storedReactions);
  }
  
  // Toggle the reaction
  const hasReacted = userReactions[reaction];
  userReactions[reaction] = !hasReacted;
  
  // Update reaction count in the confession
  if (hasReacted) {
    confession.reactions[reaction]--;
  } else {
    confession.reactions[reaction]++;
  }
  
  localStorage.setItem(reactionKey, JSON.stringify(userReactions));
  saveConfessions();
  
  return !hasReacted;
};

// Reports
export const getReports = () => {
  return [...reports].sort((a, b) => b.timestamp - a.timestamp);
};

export const addReport = (
  type: 'confession' | 'comment',
  itemId: string,
  reason: ReportReason,
  userId: string
) => {
  const newReport: Report = {
    id: uuidv4(),
    type,
    itemId,
    reason,
    userId,
    timestamp: Date.now(),
    resolved: false
  };
  
  reports.push(newReport);
  saveReports();
  return newReport;
};

export const resolveReport = (id: string) => {
  const report = reports.find(r => r.id === id);
  if (!report) return;
  
  report.resolved = true;
  saveReports();
};

// Initialize data
initializeData();

// Export room data
export const rooms: { id: Room; name: string; description: string }[] = [
  {
    id: 'relationships',
    name: 'Relationships',
    description: 'Share your relationship secrets, crushes, and romantic dilemmas.'
  },
  {
    id: 'school',
    name: 'School',
    description: 'Confess about your academic life, grades, teachers, and classmates.'
  },
  {
    id: 'work',
    name: 'Work',
    description: 'Vent about your job, coworkers, boss, or workplace secrets.'
  },
  {
    id: 'family',
    name: 'Family',
    description: 'Share secrets about your family dynamics and home life.'
  },
  {
    id: 'friends',
    name: 'Friends',
    description: 'Confess about your friendships, social circles, and friend drama.'
  },
  {
    id: 'random',
    name: 'Random',
    description: 'For everything else that doesn\'t fit elsewhere.'
  }
];
