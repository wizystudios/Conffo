
# Fix Plan — Auth, Profile, Onboarding & Confession Cards

I've grouped your 8 points into a focused execution plan. I'll implement them in this order so each fix builds on the previous one.

## 1. Auth & Registration fixes

- **Stop asking "what should we call you?" after signup**
  Persist the chosen username during registration so the onboarding gate skips the username step when one already exists. Fix `MultiStepAuthPage` to write `username` into `profiles` on signup, and update `OnboardingGate` to skip the username step if `profile.username` is set and not derived from email.
- **Show username (not email prefix) in profile**
  Update `AuthContext.fetchUserProfile` to never fall back to `email.split('@')[0]` when a real username exists. Ensure profile-edit form preloads username/birthdate/gender/country/phone from `profiles`.
- **Password policy alignment**
  Change registration min length from 6 → **8 characters** everywhere (`MultiStepAuthPage`, `EnhancedRegistrationForm`) and align validation messages.
- **Phone signup re-enabled + country pre-fill**
  Re-enable phone option in `MultiStepAuthPage`. Reuse the country selected earlier in the flow as the default dial code in the phone step (no second country picker).
- **Confirmation email feedback**
  After signup, show a clear toast/inline message: "We sent a confirmation link to your email — please check your inbox." Same pattern for forgot-password ("Reset link sent"). Fix the forgot-password "stuck" state by surfacing errors and a retry.

## 2. Email branding & redirect

- Set `emailRedirectTo` to `https://conffo.lovable.app/auth` (production) instead of `window.location.origin` so localhost is never used.
- Scaffold Lovable auth email templates branded as **Conffo** (sender name, blue→purple gradient header, Conffo logo/wordmark) for: signup confirmation, password recovery, magic link.
- This requires an email domain. I'll show the email-domain setup dialog, then scaffold + deploy `auth-email-hook`.

## 3. Profile persistence

- On signup, write `username, date_of_birth, gender, country, phone` into `profiles` (currently some fields are dropped).
- `EnhancedProfileSettings` / `ProfileUpdateForm`: pre-fill all fields from `profiles` so the edit form is never blank.

## 4. "Saved accounts" device shortcut + Account deletion

- **Device account shortcuts**: store a list of `{id, username, avatarUrl, email}` in `localStorage` after a successful login. On the auth page, render those as tappable avatar chips → one-tap re-login (uses existing Supabase session if still valid, otherwise prompts password). Long-press to remove a shortcut.
- **Delete account**: add a "Delete account" entry at the bottom of Settings. Flow: confirm → re-enter password → final "I understand, this is permanent" checkbox → calls a new `delete-account` edge function that:
  - verifies password,
  - deletes profile + user-owned rows (confessions, comments, messages, follows, etc.) via cascading deletes / explicit deletes,
  - calls `auth.admin.deleteUser(userId)`,
  - signs the user out, clears local shortcuts, redirects to Welcome.

## 5. First-run landing = Explore + "Create your own crew / Be fans of other Confessors"

- After signup completes onboarding, route to `/explore` (not `/home`).
- Rename the **People you may know** rail to **"Create your own crew · Be fans of other Confessors"**.
- Each suggestion card shows: avatar, username, **fans count** and **crew count**, follow button. Wire to existing suggestions endpoint with loading/empty/refresh states (already partially done — finish it).

## 6. Confession card redesign

- **Caption clamp + drop-down**: clamp text to ~3 lines / 3 paragraphs. If overflow, show inline "…more" toggle that expands in place; "less" collapses it back. No modal.
- **Media corners**: apply `rounded-2xl` to all media tiles in the card.
- **Multi-media layout**: when >2 media items, render them as a horizontally swipeable row with reduced thumbnail size (peek next item). Tapping any media opens the full confession view with the carousel at the active index.

## Technical notes (for reference)

- Files I'll touch: `src/pages/MultiStepAuthPage.tsx`, `src/components/EnhancedRegistrationForm.tsx`, `src/components/OnboardingGate.tsx`, `src/context/AuthContext.tsx`, `src/components/ForgotPasswordModal.tsx`, `src/components/EnhancedProfileSettings.tsx`, `src/components/ProfileUpdateForm.tsx`, `src/pages/SearchPage.tsx` (Explore rail), `src/components/PeopleYouMayKnow.tsx`, `src/components/ConfessionCard.tsx` (+ any cards reused on feed), `src/App.tsx` (post-onboarding route), new `src/components/SavedAccountsRail.tsx`, new `src/components/DeleteAccountSection.tsx`, new edge function `supabase/functions/delete-account/index.ts`.
- New DB work: ensure `profiles` has `country`, `phone`, `date_of_birth`, `gender` columns (add if missing) and update RLS so a user can only update their own row. Add RPC or edge function `delete_account` with service role.
- Email branding: requires email domain — I'll trigger the setup dialog. Until DNS verifies, default Lovable emails keep working.

## Execution order

1. Database migration (ensure profile columns exist, add `delete-account` permissions).
2. Auth page + onboarding gate + AuthContext (points 1, 2-redirect, 3, 4-phone, 5).
3. Profile edit pre-fill (point 5).
4. Saved-accounts shortcut + Delete-account flow (point 6).
5. Post-signup route → Explore + finish "crew/fans" rail with counts (point 7).
6. Confession card: clamp/expand + media carousel/rounded (point 8).
7. Email domain setup dialog → scaffold Conffo-branded auth emails (point 2-emails).

Approve and I'll start at step 1.
