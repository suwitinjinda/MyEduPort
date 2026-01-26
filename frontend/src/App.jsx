import React, { useEffect, useState } from "react";
import { NavLink, Route, Routes, Navigate, useLocation, useNavigate } from "react-router-dom";
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import ProfileEditor from "./pages/ProfileEditor.jsx";
import Recommendations from "./pages/Recommendations.jsx";
import Chatbot from "./pages/Chatbot.jsx";
import ParentDashboard from "./pages/ParentDashboard.jsx";
import StudentDetail from "./pages/StudentDetail.jsx";
import ActivitiesEditor from "./pages/ActivitiesEditor.jsx";
import EssayEditor from "./pages/EssayEditor.jsx";
import Pricing from "./pages/Pricing.jsx";
import ExportPortfolio from "./pages/ExportPortfolio.jsx";
import Admin from "./pages/Admin.jsx";
import Settings from "./pages/Settings.jsx";
import PrivacyPolicy from "./pages/PrivacyPolicy.jsx";
import UserProfileDropdown from "./components/UserProfileDropdown.jsx";
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

  // Check admin status when signed in
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

  const ProtectedRoute = ({ children }) => {
    if (!isSignedIn) {
      return <Navigate to="/login" replace state={{ from: location.pathname }} />;
    }
    return children;
  };

  return (
    <div className="app-shell">
      <header className="top-nav">
        <div className="logo">MyEduPort</div>
        <nav>
          <NavLink to="/" end>
            Home
          </NavLink>
          {userRole === "parent" ? (
            <>
              <NavLink to="/parent">Parent Dashboard</NavLink>
            </>
          ) : (
            <>
              <NavLink to="/dashboard">Dashboard</NavLink>
              <NavLink to="/profile">Portfolio</NavLink>
              <NavLink to="/essay">Essay Editor</NavLink>
              <NavLink to="/recommendations">Universities</NavLink>
              <NavLink to="/chat">EduBot</NavLink>
            </>
          )}
          <NavLink to="/pricing">Pricing</NavLink>
        </nav>
        {isSignedIn ? (
          <UserProfileDropdown userRole={userRole} isAdmin={isAdmin} />
        ) : (
          <button className="button ghost" type="button" onClick={handleAuthClick}>
            Sign In
          </button>
        )}
      </header>
      <main className="page-container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfileEditor />
              </ProtectedRoute>
            }
          />
          <Route
            path="/recommendations"
            element={
              <ProtectedRoute>
                <Recommendations />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <Chatbot />
              </ProtectedRoute>
            }
          />
          <Route
            path="/parent"
            element={
              <ProtectedRoute>
                <ParentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/parent/student/:studentId"
            element={
              <ProtectedRoute>
                <StudentDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/activities"
            element={
              <ProtectedRoute>
                <ActivitiesEditor />
              </ProtectedRoute>
            }
          />
          <Route
            path="/essay"
            element={
              <ProtectedRoute>
                <EssayEditor />
              </ProtectedRoute>
            }
          />
          <Route path="/pricing" element={<Pricing />} />
          <Route
            path="/export"
            element={
              <ProtectedRoute>
                <ExportPortfolio />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <Admin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route path="/privacy" element={<PrivacyPolicy />} />
        </Routes>
      </main>
    </div>
  );
}
