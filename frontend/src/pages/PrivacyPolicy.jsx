import React from "react";

export default function PrivacyPolicy() {
  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "2rem 1rem" }}>
      {/* Header */}
      <div
        style={{
          background: "linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)",
          color: "#fff",
          padding: "3rem 2rem",
          borderRadius: "0.75rem",
          marginBottom: "2rem",
          boxShadow: "var(--shadow-lg)",
          textAlign: "center"
        }}
      >
        <h1 style={{ fontSize: "2.5rem", fontWeight: "700", marginBottom: "0.5rem" }}>Privacy Policy</h1>
        <p style={{ fontSize: "1.125rem", opacity: 0.95 }}>Your privacy and data security are important to us</p>
        <p style={{ fontSize: "0.875rem", opacity: 0.85, marginTop: "0.5rem" }}>Last Updated: January 2025</p>
      </div>

      {/* Introduction */}
      <div className="card" style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.75rem", fontWeight: "700", marginBottom: "1rem", color: "var(--primary)" }}>
          Introduction
        </h2>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          Welcome to <strong>MyEduPort</strong>. We are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, store, and protect your data when you use our educational portfolio management platform.
        </p>
        <p style={{ lineHeight: "1.8" }}>
          By using MyEduPort, you agree to the collection and use of information in accordance with this policy. If you do not agree with our policies and practices, please do not use our service.
        </p>
      </div>

      {/* Information We Collect */}
      <div className="card" style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.75rem", fontWeight: "700", marginBottom: "1rem", color: "var(--primary)" }}>
          1. Information We Collect
        </h2>
        
        <h3 style={{ fontSize: "1.25rem", fontWeight: "600", marginTop: "1.5rem", marginBottom: "0.75rem" }}>
          1.1 Account Information
        </h3>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          When you create an account, we collect:
        </p>
        <ul style={{ paddingLeft: "1.5rem", lineHeight: "1.8", marginBottom: "1rem" }}>
          <li><strong>Name:</strong> Your full name for account identification</li>
          <li><strong>Email Address:</strong> Used for account authentication and communication</li>
          <li><strong>Password:</strong> Securely hashed and stored (we never see your actual password)</li>
          <li><strong>Role:</strong> Whether you are a student or parent</li>
          <li><strong>Data Consent:</strong> Your consent to data processing (required for account creation)</li>
        </ul>

        <h3 style={{ fontSize: "1.25rem", fontWeight: "600", marginTop: "1.5rem", marginBottom: "0.75rem" }}>
          1.2 Student Profile Information
        </h3>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          For student accounts, we collect and store:
        </p>
        <ul style={{ paddingLeft: "1.5rem", lineHeight: "1.8", marginBottom: "1rem" }}>
          <li><strong>Academic Information:</strong> Grade level, school name, target countries, intended major</li>
          <li><strong>Academic Records:</strong> Yearly grades, courses, GPA, school system (AP/IB/A-Level)</li>
          <li><strong>Standardized Test Scores:</strong> SAT, ACT, IELTS, TOEFL, and other test results</li>
          <li><strong>Extracurricular Activities:</strong> Activities, roles, duration, hours per week, leadership positions</li>
          <li><strong>Awards & Achievements:</strong> Competitions, honors, recognitions</li>
          <li><strong>Work Experience:</strong> Jobs, internships, volunteer work</li>
          <li><strong>Biography:</strong> Personal statements and background information</li>
        </ul>

        <h3 style={{ fontSize: "1.25rem", fontWeight: "600", marginTop: "1.5rem", marginBottom: "0.75rem" }}>
          1.3 Documents & Files
        </h3>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          You may upload various documents including:
        </p>
        <ul style={{ paddingLeft: "1.5rem", lineHeight: "1.8", marginBottom: "1rem" }}>
          <li>Transcripts and academic records</li>
          <li>Test score reports</li>
          <li>Certificates and awards</li>
          <li>Essays and personal statements</li>
          <li>Photos and other supporting materials</li>
        </ul>
        <p style={{ lineHeight: "1.8", fontStyle: "italic", color: "var(--text-secondary)" }}>
          File storage limits vary by subscription plan (Free: 100MB, Essential: 3GB, Professional: 10GB, Elite: Unlimited).
        </p>

        <h3 style={{ fontSize: "1.25rem", fontWeight: "600", marginTop: "1.5rem", marginBottom: "0.75rem" }}>
          1.4 AI-Generated Content
        </h3>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          When you use our AI features, we process and store:
        </p>
        <ul style={{ paddingLeft: "1.5rem", lineHeight: "1.8", marginBottom: "1rem" }}>
          <li>AI analysis reports (portfolio strength scores, gap analysis)</li>
          <li>University recommendations and match percentages</li>
          <li>Essay feedback and suggestions</li>
          <li>Chatbot conversation history</li>
          <li>AI-generated insights and recommendations</li>
        </ul>

        <h3 style={{ fontSize: "1.25rem", fontWeight: "600", marginTop: "1.5rem", marginBottom: "0.75rem" }}>
          1.5 Parent-Student Linking
        </h3>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          When parents link to student accounts:
        </p>
        <ul style={{ paddingLeft: "1.5rem", lineHeight: "1.8", marginBottom: "1rem" }}>
          <li>Invite codes used to establish parent-student relationships</li>
          <li>Linked student data accessible to parents (read-only access)</li>
        </ul>

        <h3 style={{ fontSize: "1.25rem", fontWeight: "600", marginTop: "1.5rem", marginBottom: "0.75rem" }}>
          1.6 Usage Data
        </h3>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          We automatically collect:
        </p>
        <ul style={{ paddingLeft: "1.5rem", lineHeight: "1.8" }}>
          <li>Account creation and last login timestamps</li>
          <li>Feature usage statistics (for service improvement)</li>
          <li>Error logs and technical data (for troubleshooting)</li>
        </ul>
      </div>

      {/* How We Use Your Information */}
      <div className="card" style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.75rem", fontWeight: "700", marginBottom: "1rem", color: "var(--primary)" }}>
          2. How We Use Your Information
        </h2>
        
        <h3 style={{ fontSize: "1.25rem", fontWeight: "600", marginTop: "1.5rem", marginBottom: "0.75rem" }}>
          2.1 Core Services
        </h3>
        <ul style={{ paddingLeft: "1.5rem", lineHeight: "1.8", marginBottom: "1rem" }}>
          <li>Create and maintain your educational portfolio</li>
          <li>Provide personalized university recommendations based on your profile</li>
          <li>Generate AI-powered gap analysis and improvement suggestions</li>
          <li>Calculate portfolio strength scores and acceptance predictions</li>
          <li>Provide essay feedback and writing assistance</li>
          <li>Enable parent-student account linking and monitoring</li>
        </ul>

        <h3 style={{ fontSize: "1.25rem", fontWeight: "600", marginTop: "1.5rem", marginBottom: "0.75rem" }}>
          2.2 AI & Machine Learning
        </h3>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          Your data may be used to:
        </p>
        <ul style={{ paddingLeft: "1.5rem", lineHeight: "1.8", marginBottom: "1rem" }}>
          <li>Train and improve our AI models for better recommendations</li>
          <li>Generate personalized insights and predictions</li>
          <li>Enhance the accuracy of university matching algorithms</li>
          <li>Improve essay analysis and feedback quality</li>
        </ul>
        <div style={{ background: "var(--bg-secondary)", padding: "1rem", borderRadius: "0.5rem", marginTop: "1rem" }}>
          <p style={{ lineHeight: "1.8", margin: 0, fontSize: "0.875rem" }}>
            <strong>Note:</strong> Your personal identifying information is anonymized when used for AI model training. We do not share your individual data with third-party AI providers in a personally identifiable manner.
          </p>
        </div>

        <h3 style={{ fontSize: "1.25rem", fontWeight: "600", marginTop: "1.5rem", marginBottom: "0.75rem" }}>
          2.3 Communication
        </h3>
        <ul style={{ paddingLeft: "1.5rem", lineHeight: "1.8", marginBottom: "1rem" }}>
          <li>Send important account notifications and updates</li>
          <li>Respond to your support requests and inquiries</li>
          <li>Provide service announcements and feature updates</li>
        </ul>

        <h3 style={{ fontSize: "1.25rem", fontWeight: "600", marginTop: "1.5rem", marginBottom: "0.75rem" }}>
          2.4 Service Improvement
        </h3>
        <ul style={{ paddingLeft: "1.5rem", lineHeight: "1.8" }}>
          <li>Analyze usage patterns to improve our platform</li>
          <li>Fix bugs and technical issues</li>
          <li>Develop new features and services</li>
          <li>Ensure platform security and prevent fraud</li>
        </ul>
      </div>

      {/* Data Storage & Security */}
      <div className="card" style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.75rem", fontWeight: "700", marginBottom: "1rem", color: "var(--primary)" }}>
          3. Data Storage & Security
        </h2>
        
        <h3 style={{ fontSize: "1.25rem", fontWeight: "600", marginTop: "1.5rem", marginBottom: "0.75rem" }}>
          3.1 Data Storage
        </h3>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          Your data is stored securely in:
        </p>
        <ul style={{ paddingLeft: "1.5rem", lineHeight: "1.8", marginBottom: "1rem" }}>
          <li><strong>MySQL Database:</strong> All structured data (profiles, academics, activities, etc.)</li>
          <li><strong>File Storage:</strong> Uploaded documents stored on secure servers</li>
          <li><strong>Encryption:</strong> All data transmitted over HTTPS (SSL/TLS)</li>
        </ul>

        <h3 style={{ fontSize: "1.25rem", fontWeight: "600", marginTop: "1.5rem", marginBottom: "0.75rem" }}>
          3.2 Security Measures
        </h3>
        <ul style={{ paddingLeft: "1.5rem", lineHeight: "1.8", marginBottom: "1rem" }}>
          <li><strong>Password Security:</strong> Passwords are hashed using bcrypt (never stored in plain text)</li>
          <li><strong>Authentication:</strong> JWT tokens for secure session management</li>
          <li><strong>Role-Based Access:</strong> Users can only access their own data</li>
          <li><strong>Parent Access Control:</strong> Parents can only view linked student accounts</li>
          <li><strong>HTTPS:</strong> All data transmission encrypted in production</li>
          <li><strong>Account Protection:</strong> Accounts can be disabled or soft-deleted for security</li>
        </ul>

        <h3 style={{ fontSize: "1.25rem", fontWeight: "600", marginTop: "1.5rem", marginBottom: "0.75rem" }}>
          3.3 Data Retention
        </h3>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          We retain your data:
        </p>
        <ul style={{ paddingLeft: "1.5rem", lineHeight: "1.8" }}>
          <li>While your account is active</li>
          <li>For 30 days after account deletion (soft delete period)</li>
          <li>Anonymized data may be retained longer for AI model improvement</li>
        </ul>
      </div>

      {/* Data Sharing */}
      <div className="card" style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.75rem", fontWeight: "700", marginBottom: "1rem", color: "var(--primary)" }}>
          4. Data Sharing & Third Parties
        </h2>
        
        <h3 style={{ fontSize: "1.25rem", fontWeight: "600", marginTop: "1.5rem", marginBottom: "0.75rem" }}>
          4.1 We Do Not Sell Your Data
        </h3>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          We do not sell, rent, or trade your personal information to third parties for marketing purposes.
        </p>

        <h3 style={{ fontSize: "1.25rem", fontWeight: "600", marginTop: "1.5rem", marginBottom: "0.75rem" }}>
          4.2 Service Providers
        </h3>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          We may share data with trusted service providers who help us operate our platform:
        </p>
        <ul style={{ paddingLeft: "1.5rem", lineHeight: "1.8", marginBottom: "1rem" }}>
          <li><strong>Cloud Hosting:</strong> For secure data storage and hosting</li>
          <li><strong>AI Services:</strong> For generating recommendations and analysis (data is anonymized)</li>
          <li><strong>Email Services:</strong> For sending notifications and communications</li>
        </ul>
        <p style={{ lineHeight: "1.8", fontStyle: "italic", color: "var(--text-secondary)" }}>
          All service providers are contractually obligated to protect your data and use it only for specified purposes.
        </p>

        <h3 style={{ fontSize: "1.25rem", fontWeight: "600", marginTop: "1.5rem", marginBottom: "0.75rem" }}>
          4.3 Legal Requirements
        </h3>
        <p style={{ lineHeight: "1.8" }}>
          We may disclose your information if required by law, court order, or government regulation, or to protect our rights and the safety of our users.
        </p>
      </div>

      {/* Your Rights */}
      <div className="card" style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.75rem", fontWeight: "700", marginBottom: "1rem", color: "var(--primary)" }}>
          5. Your Rights & Choices
        </h2>
        
        <h3 style={{ fontSize: "1.25rem", fontWeight: "600", marginTop: "1.5rem", marginBottom: "0.75rem" }}>
          5.1 Access Your Data
        </h3>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          You can access all your data through your account dashboard. You can view, edit, or delete any information you've provided.
        </p>

        <h3 style={{ fontSize: "1.25rem", fontWeight: "600", marginTop: "1.5rem", marginBottom: "0.75rem" }}>
          5.2 Delete Your Account
        </h3>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          You have the right to delete your account at any time. When you delete your account:
        </p>
        <ul style={{ paddingLeft: "1.5rem", lineHeight: "1.8", marginBottom: "1rem" }}>
          <li>Your account is immediately disabled</li>
          <li>All personal data is marked for deletion</li>
          <li>Data is permanently removed after 30 days (soft delete period)</li>
          <li>Anonymized data may be retained for AI model improvement</li>
        </ul>
        <p style={{ lineHeight: "1.8" }}>
          To delete your account, go to <strong>Settings</strong> → <strong>Delete Account</strong> and follow the instructions.
        </p>

        <h3 style={{ fontSize: "1.25rem", fontWeight: "600", marginTop: "1.5rem", marginBottom: "0.75rem" }}>
          5.3 Withdraw Consent
        </h3>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          You can withdraw your consent to data processing at any time by deleting your account. Note that withdrawing consent may limit your ability to use certain features of the platform.
        </p>

        <h3 style={{ fontSize: "1.25rem", fontWeight: "600", marginTop: "1.5rem", marginBottom: "0.75rem" }}>
          5.4 Export Your Data
        </h3>
        <p style={{ lineHeight: "1.8" }}>
          You can export your portfolio data as a PDF through the <strong>Export Portfolio</strong> feature in your dashboard.
        </p>

        <h3 style={{ fontSize: "1.25rem", fontWeight: "600", marginTop: "1.5rem", marginBottom: "0.75rem" }}>
          5.5 Parent-Student Relationships
        </h3>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          <strong>For Students:</strong> You can unlink your account from a parent at any time through your profile settings.
        </p>
        <p style={{ lineHeight: "1.8" }}>
          <strong>For Parents:</strong> You can unlink from a student account, but you will lose access to that student's data.
        </p>
      </div>

      {/* Children's Privacy */}
      <div className="card" style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.75rem", fontWeight: "700", marginBottom: "1rem", color: "var(--primary)" }}>
          6. Children's Privacy
        </h2>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          MyEduPort is designed for students in grades 9-12 (ages 14-18). We recognize the importance of protecting children's privacy.
        </p>
        <ul style={{ paddingLeft: "1.5rem", lineHeight: "1.8" }}>
          <li>Students under 18 should have parental consent to use the platform</li>
          <li>Parents can monitor their children's accounts through the parent dashboard</li>
          <li>We do not knowingly collect data from children under 13 without parental consent</li>
          <li>If you believe we have collected data from a child under 13, please contact us immediately</li>
        </ul>
      </div>

      {/* Cookies & Tracking */}
      <div className="card" style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.75rem", fontWeight: "700", marginBottom: "1rem", color: "var(--primary)" }}>
          7. Cookies & Tracking
        </h2>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          We use minimal tracking technologies:
        </p>
        <ul style={{ paddingLeft: "1.5rem", lineHeight: "1.8" }}>
          <li><strong>Authentication Tokens:</strong> Stored in browser localStorage for session management</li>
          <li><strong>No Third-Party Tracking:</strong> We do not use advertising cookies or third-party tracking</li>
          <li><strong>Analytics:</strong> We may use basic analytics to improve our service (anonymized)</li>
        </ul>
      </div>

      {/* International Users */}
      <div className="card" style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.75rem", fontWeight: "700", marginBottom: "1rem", color: "var(--primary)" }}>
          8. International Users
        </h2>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          MyEduPort is used by students and parents worldwide. By using our service, you acknowledge that:
        </p>
        <ul style={{ paddingLeft: "1.5rem", lineHeight: "1.8" }}>
          <li>Your data may be transferred to and stored in servers located outside your country</li>
          <li>We comply with applicable data protection laws, including GDPR for EU users</li>
          <li>You have the right to access, correct, and delete your personal data</li>
        </ul>
      </div>

      {/* Changes to Privacy Policy */}
      <div className="card" style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.75rem", fontWeight: "700", marginBottom: "1rem", color: "var(--primary)" }}>
          9. Changes to This Privacy Policy
        </h2>
        <p style={{ lineHeight: "1.8", marginBottom: "1rem" }}>
          We may update this Privacy Policy from time to time. We will notify you of any significant changes by:
        </p>
        <ul style={{ paddingLeft: "1.5rem", lineHeight: "1.8" }}>
          <li>Posting the updated policy on this page</li>
          <li>Updating the "Last Updated" date at the top</li>
          <li>Sending an email notification for major changes</li>
        </ul>
        <p style={{ lineHeight: "1.8", marginTop: "1rem" }}>
          Your continued use of MyEduPort after changes are posted constitutes acceptance of the updated policy.
        </p>
      </div>

      {/* Contact Information */}
      <div className="card" style={{ background: "var(--bg-secondary)", padding: "2rem" }}>
        <h2 style={{ fontSize: "1.75rem", fontWeight: "700", marginBottom: "1rem", color: "var(--primary)" }}>
          10. Contact Us
        </h2>
        <p style={{ lineHeight: "1.8", marginBottom: "1.5rem" }}>
          If you have questions, concerns, or requests regarding this Privacy Policy or your personal data, please contact us:
        </p>
        <div style={{ background: "var(--bg-primary)", padding: "1.5rem", borderRadius: "0.5rem" }}>
          <p style={{ lineHeight: "1.8", marginBottom: "0.5rem" }}>
            <strong>Email:</strong> privacy@myeduport.com
          </p>
          <p style={{ lineHeight: "1.8", marginBottom: "0.5rem" }}>
            <strong>Support:</strong> support@myeduport.com
          </p>
          <p style={{ lineHeight: "1.8", marginBottom: "0.5rem" }}>
            <strong>Response Time:</strong> We aim to respond within 48 hours
          </p>
        </div>
      </div>

      {/* Footer Note */}
      <div style={{ textAlign: "center", marginTop: "2rem", padding: "1.5rem", color: "var(--text-secondary)" }}>
        <p style={{ lineHeight: "1.8", fontSize: "0.875rem" }}>
          By using MyEduPort, you acknowledge that you have read and understood this Privacy Policy.
        </p>
        <p style={{ lineHeight: "1.8", fontSize: "0.875rem", marginTop: "0.5rem" }}>
          <a href="/settings" style={{ color: "var(--primary)", textDecoration: "underline" }}>
            Manage your privacy settings
          </a>
        </p>
      </div>
    </div>
  );
}
