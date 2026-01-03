import { Layout } from '@/components/Layout';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function PrivacyPage() {
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <h1 className="text-2xl font-bold mb-6">Privacy Policy</h1>
        
        <div className="space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold mb-3">1. Information We Collect</h2>
            <p className="text-muted-foreground mb-2">
              We collect information you provide directly to us:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
              <li>Account information (email, username, profile details)</li>
              <li>Content you post (confessions, comments, messages)</li>
              <li>Usage data (how you interact with the app)</li>
            </ul>
          </section>
          
          <section>
            <h2 className="text-lg font-semibold mb-3">2. How We Use Your Information</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
              <li>Provide, maintain, and improve our services</li>
              <li>Process and complete transactions</li>
              <li>Send technical notices and support messages</li>
              <li>Monitor and analyze usage patterns</li>
              <li>Prevent fraudulent use of our services</li>
            </ul>
          </section>
          
          <section>
            <h2 className="text-lg font-semibold mb-3">3. Information Sharing</h2>
            <p className="text-muted-foreground mb-2">
              We do not share your personal information with third parties except:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
              <li>With your consent</li>
              <li>To comply with legal obligations</li>
              <li>To protect our rights and the safety of others</li>
            </ul>
          </section>
          
          <section>
            <h2 className="text-lg font-semibold mb-3">4. Data Security</h2>
            <p className="text-muted-foreground">
              We implement reasonable security measures to protect your information. However, no method of transmission over the Internet is 100% secure.
            </p>
          </section>
          
          <section>
            <h2 className="text-lg font-semibold mb-3">5. Your Choices</h2>
            <p className="text-muted-foreground">
              You can update your account information at any time. You may also delete your account, although this will not remove content already shared publicly.
            </p>
          </section>
          
          <section>
            <h2 className="text-lg font-semibold mb-3">6. Data Retention</h2>
            <p className="text-muted-foreground">
              We retain your information for as long as your account is active or as needed to provide services. You can request deletion of your data.
            </p>
          </section>
          
          <section>
            <h2 className="text-lg font-semibold mb-3">7. Changes to This Policy</h2>
            <p className="text-muted-foreground">
              We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page.
            </p>
          </section>
          
          <section>
            <h2 className="text-lg font-semibold mb-3">8. Contact Us</h2>
            <p className="text-muted-foreground">
              If you have any questions about this privacy policy, please contact us through the app.
            </p>
          </section>
        </div>
      </div>
    </Layout>
  );
}
