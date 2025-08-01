// Utility function to trigger success animations globally
export const triggerSuccessAnimation = (message: string) => {
  const event = new CustomEvent('conffo-success', {
    detail: { message }
  });
  window.dispatchEvent(event);
};

// Common success messages with fish emoji
export const SUCCESS_MESSAGES = {
  like: 'Liked! 🐟',
  save: 'Saved! 🐟',
  comment: 'Comment posted! 🐟',
  reply: 'Reply posted! 🐟',
  follow: 'Following! 🐟',
  share: 'Shared! 🐟',
  create: 'Created! 🐟',
  update: 'Updated! 🐟',
} as const;