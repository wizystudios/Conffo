// Lightweight, client-side biometric unlock backed by WebAuthn platform authenticators
// (Face ID / Touch ID / Windows Hello / Android BiometricPrompt).
//
// This is a LOCAL unlock gate, not a replacement for Supabase auth. Supabase's
// refresh-token session already persists across page reloads and devices; this
// module simply requires a biometric gesture before the app renders on devices
// where the user opted in.
//
// Rationale: no server-side WebAuthn challenge/verification is needed because
// the credential never proves identity to Supabase — it only unlocks a session
// that Supabase already established. This keeps the flow WhatsApp-simple.

const b64url = (buf: ArrayBuffer): string => {
  const bytes = new Uint8Array(buf);
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const fromB64url = (s: string): ArrayBuffer => {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
};

type StoredCredential = {
  credentialId: string; // base64url
  deviceLabel: string;
  createdAt: string;
};

const enabledKey = (userId: string) => `conffo_biometric_${userId}`;
const unlockedKey = (userId: string) => `conffo_biometric_unlocked_${userId}`;

export function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (typeof window === "undefined" || !window.PublicKeyCredential) return Promise.resolve(false);
  const anyCred = window.PublicKeyCredential as unknown as {
    isUserVerifyingPlatformAuthenticatorAvailable?: () => Promise<boolean>;
  };
  if (!anyCred.isUserVerifyingPlatformAuthenticatorAvailable) return Promise.resolve(false);
  return anyCred.isUserVerifyingPlatformAuthenticatorAvailable().catch(() => false);
}

export function getStoredCredential(userId: string): StoredCredential | null {
  try {
    const raw = localStorage.getItem(enabledKey(userId));
    return raw ? (JSON.parse(raw) as StoredCredential) : null;
  } catch {
    return null;
  }
}

export function isBiometricEnabled(userId: string): boolean {
  return !!getStoredCredential(userId);
}

export function isSessionUnlocked(userId: string): boolean {
  try {
    return sessionStorage.getItem(unlockedKey(userId)) === "1";
  } catch {
    return false;
  }
}

export function markSessionUnlocked(userId: string): void {
  try { sessionStorage.setItem(unlockedKey(userId), "1"); } catch { /* ignore */ }
}

export function clearSessionUnlock(userId: string): void {
  try { sessionStorage.removeItem(unlockedKey(userId)); } catch { /* ignore */ }
}

export async function registerBiometric(userId: string, username: string): Promise<StoredCredential> {
  if (!(await isPlatformAuthenticatorAvailable())) throw new Error("Biometrics not available on this device.");

  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const userIdBytes = new TextEncoder().encode(userId);

  const cred = await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: "Conffo", id: window.location.hostname },
      user: { id: userIdBytes, name: username, displayName: username },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },   // ES256
        { type: "public-key", alg: -257 }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
        residentKey: "preferred",
      },
      timeout: 60_000,
      attestation: "none",
    },
  }) as PublicKeyCredential | null;

  if (!cred) throw new Error("Registration cancelled");

  const stored: StoredCredential = {
    credentialId: b64url(cred.rawId),
    deviceLabel: navigator.userAgent.slice(0, 80),
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem(enabledKey(userId), JSON.stringify(stored));
  markSessionUnlocked(userId);
  return stored;
}

export async function unlockWithBiometric(userId: string): Promise<boolean> {
  const stored = getStoredCredential(userId);
  if (!stored) throw new Error("Biometric unlock is not set up on this device.");

  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge,
      allowCredentials: [{
        type: "public-key",
        id: fromB64url(stored.credentialId),
        transports: ["internal"],
      }],
      userVerification: "required",
      timeout: 60_000,
      rpId: window.location.hostname,
    },
  }) as PublicKeyCredential | null;

  if (!assertion) return false;
  markSessionUnlocked(userId);
  return true;
}

export function disableBiometric(userId: string): void {
  try {
    localStorage.removeItem(enabledKey(userId));
    sessionStorage.removeItem(unlockedKey(userId));
  } catch { /* ignore */ }
}
