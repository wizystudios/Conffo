
import { Layout } from '@/components/Layout';

export default function TermsPage() {
  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Terms & Conditions</h1>
        
        <div className="prose prose-sm max-w-none">
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using the Confession Room service, you agree to be bound by these Terms and Conditions. 
            If you do not agree to all the terms and conditions, you may not access or use the service.
          </p>
          
          <h2>2. User Conduct</h2>
          <p>
            While using our service, you agree not to:
          </p>
          <ul>
            <li>Post content that is illegal, harmful, threatening, abusive, harassing, defamatory, or invasive of another's privacy</li>
            <li>Impersonate any person or entity</li>
            <li>Post content that infringes copyright, trademark, or other intellectual property rights</li>
            <li>Share personal information of others without their consent</li>
            <li>Use the service for any illegal purpose</li>
          </ul>
          
          <h2>3. Content Moderation</h2>
          <p>
            Confession Room reserves the right to remove any content that violates these terms or that we find 
            objectionable for any reason. We may terminate access for users who violate these terms.
          </p>
          
          <h2>4. Privacy</h2>
          <p>
            Your use of the service is also governed by our Privacy Policy, which outlines how we collect, 
            use, and protect your information.
          </p>
          
          <h2>5. Disclaimer</h2>
          <p>
            The service is provided "as is" without warranties of any kind, either express or implied. 
            We do not guarantee that the service will be uninterrupted, secure, or error-free.
          </p>
          
          <h2>6. Limitation of Liability</h2>
          <p>
            Confession Room and its operators shall not be liable for any indirect, incidental, special, 
            consequential, or punitive damages, resulting from your use or inability to use the service.
          </p>
          
          <h2>7. Changes to Terms</h2>
          <p>
            We reserve the right to modify these terms at any time. We will provide notice of significant changes 
            by updating the date at the top of these terms.
          </p>
          
          <h2>8. Contact Us</h2>
          <p>
            If you have any questions about these Terms & Conditions, please contact us.
          </p>
        </div>
      </div>
    </Layout>
  );
}
