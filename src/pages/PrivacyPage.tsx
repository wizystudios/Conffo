
import { Layout } from '@/components/Layout';

export default function PrivacyPage() {
  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Privacy Policy</h1>
        
        <div className="prose prose-sm max-w-none">
          <h2>1. Information We Collect</h2>
          <p>
            We collect information you provide directly to us, such as when you create an account, 
            submit a confession, or contact us for support.
          </p>
          
          <h2>2. How We Use Your Information</h2>
          <p>
            We use the information we collect to:
          </p>
          <ul>
            <li>Provide, maintain, and improve our services</li>
            <li>Process and complete transactions</li>
            <li>Send technical notices and support messages</li>
            <li>Monitor and analyze usage patterns</li>
            <li>Prevent fraudulent use of our services</li>
          </ul>
          
          <h2>3. Information Sharing</h2>
          <p>
            We do not share your personal information with third parties except:
          </p>
          <ul>
            <li>With your consent</li>
            <li>To comply with legal obligations</li>
            <li>To protect our rights and safety and the rights and safety of others</li>
          </ul>
          
          <h2>4. Data Security</h2>
          <p>
            We implement reasonable security measures to protect your information. 
            However, no method of transmission over the Internet or electronic storage is 100% secure.
          </p>
          
          <h2>5. Your Choices</h2>
          <p>
            You can update your account information at any time. You may also delete your account, 
            although this will not remove information that has already been shared publicly on the service.
          </p>
          
          <h2>6. Changes to This Policy</h2>
          <p>
            We may update this privacy policy from time to time. We will notify you of any changes 
            by posting the new policy on this page.
          </p>
          
          <h2>7. Contact Us</h2>
          <p>
            If you have any questions about this privacy policy, please contact us.
          </p>
        </div>
      </div>
    </Layout>
  );
}
