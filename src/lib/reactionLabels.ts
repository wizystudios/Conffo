// Curated reaction labels — human, intentional language over emoji-only.
// Keeps the existing 4 reaction types and pairs each with a short label.

export type ReactionType = 'like' | 'heart' | 'laugh' | 'shock';

export const REACTION_LABELS: Record<ReactionType, { label: string; emoji: string; hint: string }> = {
  heart: { label: 'Felt this', emoji: '❤️', hint: 'This resonated with me' },
  like:  { label: 'Changed my view', emoji: '💡', hint: 'This made me think differently' },
  laugh: { label: 'Made me smile', emoji: '😊', hint: 'Light and honest' },
  shock: { label: 'Whoa', emoji: '😮', hint: 'Did not see that coming' },
};

export function reactionLabel(type: ReactionType | string): string {
  return REACTION_LABELS[type as ReactionType]?.label ?? '';
}
