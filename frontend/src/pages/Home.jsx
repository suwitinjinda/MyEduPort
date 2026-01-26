import React from "react";
import { NavLink } from "react-router-dom";

export default function Home() {
  return (
    <div className="grid" style={{ gap: "2rem" }}>
      <section className="hero">
        <div style={{ display: "inline-block", marginBottom: "1rem" }}>
          <span className="badge primary">AI-Powered Portfolio Guidance</span>
        </div>
        <h1>Build Your Complete Student Portfolio</h1>
        <h1 style={{ fontSize: "2rem", fontWeight: "400", marginTop: "-0.5rem" }}>
          Plan Your Best-Fit Universities
        </h1>
        <p style={{ fontSize: "1.125rem", opacity: 0.95, maxWidth: "600px", marginTop: "1rem" }}>
          MyEduPort helps students (Grades 9-13) capture academics, activities, awards,
          and documents while receiving AI guidance for US, UK, and China applications.
        </p>
        <div style={{ display: "flex", gap: "1rem", marginTop: "2rem", flexWrap: "wrap" }}>
          <NavLink className="button" to="/login">
            Get Started for Free
          </NavLink>
          <NavLink className="button ghost" to="/pricing" style={{ color: "#fff", borderColor: "rgba(255,255,255,0.3)" }}>
            View Pricing Plans
          </NavLink>
        </div>
      </section>

      <section>
        <div className="section-title text-center" style={{ marginBottom: "2rem" }}>
          Everything You Need for University Applications
        </div>
        <div className="grid three">
          <div className="card">
            <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>📚</div>
            <div className="subtitle">Structured Portfolio</div>
            <p className="muted" style={{ marginTop: "0.5rem" }}>
              Track grades, tests, activities, awards, and documents in one clear, organized profile.
            </p>
          </div>
          <div className="card">
            <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>🤖</div>
            <div className="subtitle">AI-Powered Guidance</div>
            <p className="muted" style={{ marginTop: "0.5rem" }}>
              Receive strength scores, gap analysis, and prioritized next steps tailored to your profile.
            </p>
          </div>
          <div className="card">
            <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>🎯</div>
            <div className="subtitle">University Matching</div>
            <p className="muted" style={{ marginTop: "0.5rem" }}>
              See Reach, Target, and Safety recommendations with detailed explanations for US, UK, and China.
            </p>
          </div>
        </div>
      </section>

      <section className="grid two">
        <div className="card highlight">
          <div className="subtitle" style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>
            👨‍🎓 For Students
          </div>
          <p className="muted" style={{ marginBottom: "1rem" }}>
            Build a comprehensive profile that captures your entire educational journey. 
            Get AI-powered insights to strengthen your application and discover your best-fit universities.
          </p>
          <ul className="list" style={{ marginTop: "1rem" }}>
            <li>✓ Track academics, tests, and activities</li>
            <li>✓ Receive AI strength scores and recommendations</li>
            <li>✓ Get matched with Reach, Target, and Safety schools</li>
            <li>✓ Chat with EduBot for personalized guidance</li>
          </ul>
        </div>
        <div className="card highlight">
          <div className="subtitle" style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>
            👨‍👩‍👧 For Parents
          </div>
          <p className="muted" style={{ marginBottom: "1rem" }}>
            Link to your student's account and monitor their portfolio progress. 
            Stay informed about completion status and important milestones.
          </p>
          <ul className="list" style={{ marginTop: "1rem" }}>
            <li>✓ Link to student profiles via invite code</li>
            <li>✓ Monitor portfolio completion progress</li>
            <li>✓ View detailed academic and activity records</li>
            <li>✓ Track achievements and documents</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
