import React, { useEffect, useState, Suspense, lazy } from "react";
import { NavLink, Route, Routes, Navigate, useLocation, useNavigate } from "react-router-dom";

// Eagerly loaded — used by the public landing experience and auth flow.
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import UserProfileDropdown from "./components/UserProfileDropdown.jsx";
import Skeleton from "./components/Skeleton.jsx";

// Lazy-loaded — splits the bundle so the landing page loads fast.
const Dashboard = lazy(() => import("./pages/Dashboard.jsx"));
const ProfileEditor = lazy(() => import("./pages/ProfileEditor.jsx"));
const Recommendations = lazy(() => import("./pages/Recommendations.jsx"));
const Chatbot = lazy(() => import("./pages/Chatbot.jsx"));
const ParentDashboard = lazy(() => import("./pages/ParentDashboard.jsx"));
const StudentDetail = lazy(() => import("./pages/StudentDetail.jsx"));
const ActivitiesEditor = lazy(() => import("./pages/ActivitiesEditor.jsx"));
const EssayEditor = lazy(() => import("./pages/EssayEditor.jsx"));
const Pricing = lazy(() => import("./pages/Pricing.jsx"));
const ExportPortfolio = lazy(() => import("./pages/ExportPortfolio.jsx"));
const Admin = lazy(() => import("./pages/Admin.jsx"));
const Settings = lazy(() => import("./pages/Settings.jsx"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy.jsx"));
const ApplicationProcess = lazy(() => import("./pages/ApplicationProcess.jsx"));
const AdmissionResources = lazy(() => import("./pages/AdmissionResources.jsx"));
const CareerResources = lazy(() => import("./pages/CareerResources.jsx"));
const About = lazy(() => import("./pages/About.jsx"));
const NewsEvents = lazy(() => import("./pages/NewsEvents.jsx"));
const UserManual = lazy(() => import("./pages/UserManual.jsx"));
const Contact = lazy(() => import("./pages/Contact.jsx"));
const Guide = lazy(() => import("./pages/Guide.jsx"));
const Tasks = lazy(() => import("./pages/Tasks.jsx"));
const Compare = lazy(() => import("./pages/Compare.jsx"));
const SharedPortfolio = lazy(() => import("./pages/SharedPortfolio.jsx"));
const CounselorDashboard = lazy(() => import("./pages/CounselorDashboard.jsx"));
const CounselorStudentDetail = lazy(() => import("./pages/CounselorStudentDetail.jsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.jsx"));

import { clearToken, getToken, getUserRole, apiFetch } from "./api/client.js";

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSignedIn, setIsSignedIn] = useState(Boolean(getToken()));
  const [userRole, setUserRole] = useState(getUserRole());
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const syncAuth = () => {
      setIsSignedIn(Boolean(getToken()));
      setUserRole(getUserRole());
    };
    window.addEventListener("storage", syncAuth);
    window.addEventListener("auth-change", syncAuth);
    return () => {
      window.removeEventListener("storage", syncAuth);
      window.removeEventListener("auth-change", syncAuth);
    };
  }, []);

  useEffect(() => {
    const checkAdmin = async () => {
      if (isSignedIn) {
        try {
          const adminCheck = await apiFetch("/api/admin/check");
          setIsAdmin(adminCheck.isAdmin || false);
        } catch (err) {
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
    };
    checkAdmin();
  }, [isSignedIn]);

  const handleAuthClick = () => {
    if (isSignedIn) {
      clearToken();
      window.dispatchEvent(new Event("auth-change"));
      navigate("/login");
      return;
    }
    navigate("/login");
  };

  const roleHome = (r) => (r === "parent" ? "/parent" : r === "counselor" ? "/counselor" : "/dashboard");

  const ProtectedRoute = ({ children, role }) => {
    if (!isSignedIn) {
      return <Navigate to="/login" replace state={{ from: location.pathname }} />;
    }
    if (role) {
      if (!userRole) {
        // signed in but token has no usable role — send to login to re-auth
        return <Navigate to="/login" replace />;
      }
      const allowed = Array.isArray(role) ? role : [role];
      const home = roleHome(userRole);
      // Guard against redirect loops: never redirect to the same path we're on.
      if (!allowed.includes(userRole) && home !== location.pathname) {
        return <Navigate to={home} replace />;
      }
    }
    return children;
  };

  return (
    <div className="app-shell">
      <header className="top-nav">
        <NavLink to="/" className="logo" style={{ display: "flex", alignItems: "center", gap: 0 }}>
          <img src="/logo.svg" alt="MyEduPort" style={{ height: "56px", width: "auto", display: "block" }} />
        </NavLink>
        <nav>
          {/* Home is redundant with Dashboard once signed in (the logo still links home). */}
          {!isSignedIn && <NavLink to="/" end>Home</NavLink>}
          {userRole === "parent" ? (
            <NavLink to="/parent">Parent</NavLink>
          ) : userRole === "counselor" ? (
            <NavLink to="/counselor">Counselor</NavLink>
          ) : (
            <>
              <NavLink to="/dashboard">Dashboard</NavLink>
              <NavLink to="/profile">Portfolio</NavLink>
              <NavLink to="/compare">Compare</NavLink>
              <NavLink to="/admission-resources">Admissions</NavLink>
              <NavLink to="/career-resources">Career</NavLink>
            </>
          )}
          <NavLink to="/guide">Guide</NavLink>
          <NavLink to="/pricing">Pricing</NavLink>
        </nav>
        {isSignedIn ? (
          <UserProfileDropdown userRole={userRole} isAdmin={isAdmin} />
        ) : (
          <button className="button gold" type="button" onClick={handleAuthClick}>
            Sign In
          </button>
        )}
      </header>

      <main className="page-container">
        <Suspense fallback={<div style={{ padding: "2rem" }}><Skeleton lines={5} /></div>}>
          <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/reset" element={<ResetPassword />} />
          <Route path="/dashboard" element={<ProtectedRoute role="student"><Dashboard /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute role="student"><ProfileEditor /></ProtectedRoute>} />
          <Route path="/recommendations" element={<ProtectedRoute role="student"><Recommendations /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute role="student"><Chatbot /></ProtectedRoute>} />
          <Route path="/application" element={<ApplicationProcess />} />
          <Route path="/admission-resources" element={<AdmissionResources />} />
          <Route path="/career-resources" element={<CareerResources />} />
          <Route path="/parent" element={<ProtectedRoute role="parent"><ParentDashboard /></ProtectedRoute>} />
          <Route path="/parent/student/:studentId" element={<ProtectedRoute role="parent"><StudentDetail /></ProtectedRoute>} />
          <Route path="/activities" element={<ProtectedRoute role="student"><ActivitiesEditor /></ProtectedRoute>} />
          <Route path="/essay" element={<ProtectedRoute role="student"><EssayEditor /></ProtectedRoute>} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/export" element={<ProtectedRoute role="student"><ExportPortfolio /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/about" element={<About />} />
          <Route path="/news-events" element={<NewsEvents />} />
          <Route path="/user-manual" element={<UserManual />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/guide" element={<Guide />} />
          <Route path="/tasks" element={<ProtectedRoute role="student"><Tasks /></ProtectedRoute>} />
          <Route path="/compare" element={<ProtectedRoute role="student"><Compare /></ProtectedRoute>} />
          <Route path="/share/:token" element={<SharedPortfolio />} />
          <Route path="/counselor" element={<ProtectedRoute role="counselor"><CounselorDashboard /></ProtectedRoute>} />
          <Route path="/counselor/student/:studentId" element={<ProtectedRoute role="counselor"><CounselorStudentDetail /></ProtectedRoute>} />
          </Routes>
        </Suspense>
      </main>

      <footer className="page-footer">
        <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
          <div
            className="footer-grid"
            style={{
              display: "grid",
              gap: "2rem",
              marginBottom: "2rem",
              paddingBottom: "2rem",
              borderBottom: "1px solid rgba(255,255,255,0.1)"
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "1.4rem",
                  fontWeight: 700,
                  color: "var(--paper)",
                  marginBottom: "0.5rem"
                }}
              >
                MyEduPort
              </div>
              <p style={{ fontFamily: "var(--font-serif)", fontSize: "0.92rem", color: "var(--paper-deep)", fontStyle: "italic", maxWidth: "32ch" }}>
                The editorial portfolio platform for ambitious students applying to top universities.
              </p>
            </div>
            <FooterColumn
              title="Platform"
              links={[
                { to: "/dashboard", label: "Dashboard" },
                { to: "/profile", label: "Portfolio" },
                { to: "/recommendations", label: "Universities" },
                { to: "/pricing", label: "Pricing" }
              ]}
            />
            <FooterColumn
              title="Resources"
              links={[
                { to: "/guide", label: "Portfolio Guide" },
                { to: "/application", label: "Application Process" },
                { to: "/admission-resources", label: "Admission Resources" },
                { to: "/career-resources", label: "Career Resources" },
                { to: "/user-manual", label: "User Manual" }
              ]}
            />
            <FooterColumn
              title="Company"
              links={[
                { to: "/about", label: "About" },
                { to: "/news-events", label: "News & Events" },
                { to: "/contact", label: "Contact" },
                { to: "/privacy", label: "Privacy" }
              ]}
            />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "0.75rem",
              fontSize: "0.78rem",
              color: "var(--paper-deep)",
              letterSpacing: "0.04em"
            }}
          >
            <span>© {new Date().getFullYear()} MyEduPort. All rights reserved.</span>
            <span style={{ fontFamily: "var(--font-serif)", fontStyle: "italic" }}>
              Built for the next generation of scholars.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FooterColumn({ title, links }) {
  return (
    <div>
      <div
        style={{
          fontSize: "0.7rem",
          fontWeight: 600,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "var(--gold)",
          marginBottom: "1rem"
        }}
      >
        {title}
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        {links.map((link) => (
          <li key={link.to}>
            <NavLink
              to={link.to}
              style={{
                color: "var(--paper-deep)",
                fontSize: "0.88rem",
                transition: "color 0.2s ease"
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--gold)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--paper-deep)")}
            >
              {link.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </div>
  );
}
