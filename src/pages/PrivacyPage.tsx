import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Standalone header — matches Terms page exactly, no bottom nav */}
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur border-b border-border/40">
        <div className="max-w-2xl mx-auto flex items-center gap-3 px-4 h-14">
          <button
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="h-10 w-10 -ml-2 flex items-center justify-center rounded-full hover:bg-muted/60 active:scale-95 transition-transform"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold">Privacy Policy</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-6 pb-16 prose prose-sm prose-neutral max-w-none">
        <p className="text-xs text-muted-foreground">Last updated: 8 May 2026 · GDPR compliant</p>

        <h2>1. Who We Are</h2>
        <p>
          Conffo ("we", "us") is the data controller for personal data
          processed through the Conffo mobile and web service ("Service").
          You can contact our Data Protection Officer at{' '}
          <strong>privacy@conffo.app</strong>.
        </p>

        <h2>2. Information We Collect</h2>
        <ul>
          <li>Account data (email or phone, username, password hash, avatar, profile details)</li>
          <li>Content you create (confessions, moments, comments, messages, audio)</li>
          <li>Social graph (fans, crew, communities you join)</li>
          <li>Device & usage data (IP address, device type, language, interactions)</li>
          <li>Optional location, contacts or media — only with your explicit permission</li>
        </ul>

        <h2>3. How We Use Your Information</h2>
        <ul>
          <li>Provide, maintain, secure and improve the Service</li>
          <li>Authenticate you and protect your account</li>
          <li>Deliver real-time messaging, presence and notifications</li>
          <li>Personalise discovery (People You May Know, suggested communities)</li>
          <li>Detect, investigate and prevent fraud, abuse and policy violations</li>
          <li>Comply with legal obligations</li>
        </ul>

        <h2>4. Legal Basis for Processing (GDPR Art. 6)</h2>
        <ul>
          <li><strong>Contract</strong> — to provide the Service you signed up for</li>
          <li><strong>Consent</strong> — for optional features (push notifications, contacts, location)</li>
          <li><strong>Legitimate interest</strong> — to keep the Service safe and to improve it</li>
          <li><strong>Legal obligation</strong> — to respond to lawful requests from authorities</li>
        </ul>

        <h2>5. Sharing Your Information</h2>
        <p>We never sell your personal data. We share only with:</p>
        <ul>
          <li>Infrastructure providers (hosting, storage, push, analytics) under strict data-processing agreements</li>
          <li>Other users — content you publish or send is visible to its intended audience</li>
          <li>Authorities when required by law or to protect rights and safety</li>
        </ul>

        <h2>6. International Transfers</h2>
        <p>
          Your data may be processed outside your country of residence. Where
          required, we rely on EU Standard Contractual Clauses and additional
          safeguards.
        </p>

        <h2>7. Data Retention</h2>
        <p>
          We keep personal data only as long as needed for the purposes above.
          When you delete your account we erase or anonymise your personal
          data within 30 days, except where law requires longer retention.
        </p>

        <h2>8. Your Rights Under GDPR</h2>
        <p>If you are in the EEA, UK or a similar jurisdiction you have the right to:</p>
        <ul>
          <li>Access a copy of your personal data</li>
          <li>Rectify inaccurate data</li>
          <li>Erasure ("right to be forgotten")</li>
          <li>Restrict or object to processing</li>
          <li>Data portability (machine-readable export)</li>
          <li>Withdraw consent at any time</li>
          <li>Lodge a complaint with your local supervisory authority</li>
        </ul>
        <p>
          To exercise any of these rights, email{' '}
          <strong>privacy@conffo.app</strong>. We respond within 30 days.
        </p>

        <h2>9. Security</h2>
        <p>
          We use encryption in transit and at rest, role-based access
          controls, row-level security on our database and continuous
          monitoring. No system is 100% secure — please use a strong password
          and keep your device safe.
        </p>

        <h2>10. Children</h2>
        <p>
          Conffo is not directed to children under 13 (or the minimum
          digital-consent age in your country). We do not knowingly collect
          their data.
        </p>

        <h2>11. Cookies & Similar Technologies</h2>
        <p>
          We use a minimal set of strictly-necessary cookies and local
          storage to keep you signed in and remember your preferences. We do
          not use third-party advertising cookies.
        </p>

        <h2>12. Changes to This Policy</h2>
        <p>
          Material changes will be notified in-app or by email at least 14
          days before they take effect.
        </p>

        <h2>13. Contact</h2>
        <p>
          For privacy questions or to exercise your rights, contact us at{' '}
          <strong>privacy@conffo.app</strong>.
        </p>
      </main>
    </div>
  );
}
