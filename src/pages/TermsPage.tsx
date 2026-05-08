import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function TermsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Standalone header with back button — no bottom nav */}
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur border-b border-border/40">
        <div className="max-w-2xl mx-auto flex items-center gap-3 px-4 h-14">
          <button
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="h-10 w-10 -ml-2 flex items-center justify-center rounded-full hover:bg-muted/60 active:scale-95 transition-transform"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold">User License Agreement</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-6 pb-16 prose prose-sm prose-neutral max-w-none">
        <p className="text-xs text-muted-foreground">Last updated: 8 May 2026</p>

        <h2>1. Introduction</h2>
        <p>
          Welcome to Conffo. By creating an account or otherwise using the Conffo
          mobile and web service ("Service") you ("User", "you") enter into a
          legally binding agreement with Conffo ("we", "us"). Please read these
          Terms together with our Privacy Policy carefully — they describe your
          rights and obligations as well as ours.
        </p>

        <h2>2. Eligibility</h2>
        <p>
          You must be at least 13 years old (or the minimum digital-consent age
          in your country, whichever is higher) to use Conffo. By registering
          you confirm that you meet this requirement and that the information
          you provide is accurate.
        </p>

        <h2>3. Your Account</h2>
        <p>
          You are responsible for safeguarding your credentials and for all
          activity under your account. Notify us immediately if you suspect any
          unauthorised access. We may suspend or terminate accounts that
          violate these Terms.
        </p>

        <h2>4. User Conduct</h2>
        <p>You agree not to use Conffo to:</p>
        <ul>
          <li>post content that is illegal, harmful, threatening, abusive, harassing, defamatory, hateful, sexually explicit involving minors, or invasive of another person's privacy;</li>
          <li>impersonate any person or misrepresent your identity or affiliation;</li>
          <li>infringe intellectual-property or other rights of any party;</li>
          <li>share another person's personal data without lawful basis or consent;</li>
          <li>interfere with the security or integrity of the Service.</li>
        </ul>

        <h2>5. Content & Licence</h2>
        <p>
          You retain ownership of content you post. You grant Conffo a
          worldwide, non-exclusive, royalty-free licence to host, store, copy,
          display and distribute that content solely to operate, improve and
          provide the Service. This licence ends when you delete the content,
          subject to reasonable backup retention periods.
        </p>

        <h2>6. Moderation</h2>
        <p>
          We may review, remove or restrict content that we reasonably believe
          violates these Terms or applicable law. We may also remove access for
          repeat or serious offenders.
        </p>

        <h2>7. Privacy & Data Protection (GDPR)</h2>
        <p>
          We process personal data in accordance with the EU General Data
          Protection Regulation (GDPR) and equivalent laws. As a data subject
          you have the right to access, rectify, erase, restrict, port and
          object to processing of your personal data, as well as the right to
          lodge a complaint with your local supervisory authority. See our{' '}
          <a href="/privacy" className="text-primary underline">Privacy Policy</a>{' '}
          for details on the data we collect, the legal bases on which we rely,
          retention periods and how to exercise your rights.
        </p>

        <h2>8. Termination & Account Deletion</h2>
        <p>
          You may delete your account at any time from the in-app settings.
          Upon deletion we will erase or anonymise your personal data within
          30 days, except where we are legally required to retain it.
        </p>

        <h2>9. Disclaimer of Warranties</h2>
        <p>
          The Service is provided "as is" and "as available" without warranties
          of any kind, express or implied. We do not guarantee that the Service
          will be uninterrupted, error-free, or completely secure.
        </p>

        <h2>10. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, Conffo will not be liable for
          any indirect, incidental, special, consequential or punitive damages,
          or any loss of profits, revenue, data or goodwill arising from your
          use of, or inability to use, the Service.
        </p>

        <h2>11. Changes to These Terms</h2>
        <p>
          We may update these Terms from time to time. Material changes will be
          notified in-app or by email at least 14 days before they take effect.
          Your continued use after the effective date constitutes acceptance.
        </p>

        <h2>12. Governing Law</h2>
        <p>
          These Terms are governed by the laws of your country of habitual
          residence, without prejudice to any mandatory consumer-protection
          rights you may have.
        </p>

        <h2>13. Contact</h2>
        <p>
          For any questions about these Terms or to exercise your data
          protection rights, contact us at <strong>support@conffo.app</strong>.
        </p>
      </main>
    </div>
  );
}
