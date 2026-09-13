import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { clearToken, apiFetch } from "../api/client";

export default function UserProfileDropdown({ userRole, isAdmin: propIsAdmin }) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(propIsAdmin || false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (propIsAdmin !== undefined) setIsAdmin(propIsAdmin);
  }, [propIsAdmin]);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await apiFetch("/api/auth/me");
        setUser(userData);
        try {
          const adminCheck = await apiFetch("/api/admin/check");
          setIsAdmin(adminCheck.isAdmin || false);
        } catch (err) {
          if (propIsAdmin !== undefined) setIsAdmin(propIsAdmin);
          else setIsAdmin(false);
        }
      } catch (err) {
        console.error("Failed to load user:", err);
      }
    };
    loadUser();

    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [propIsAdmin]);

  const handleSignOut = () => {
    clearToken();
    window.dispatchEvent(new Event("auth-change"));
    navigate("/login");
  };
  const handleMenuClick = (path) => {
    navigate(path);
    setIsOpen(false);
  };

  const getInitials = (name) => {
    if (!name) return "U";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const roleLabel = isAdmin ? "Admin" : userRole === "parent" ? "Parent" : userRole === "counselor" ? "Counselor" : "Student";

  return (
    <div ref={dropdownRef} className="user-profile-dropdown">
      <button className="user-profile-button" onClick={() => setIsOpen(!isOpen)}>
        <div className="user-avatar">{user ? getInitials(user.name) : "U"}</div>
        <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          {user?.name?.split(" ")[0] || "User"}
          <svg
            width="12"
            height="12"
            viewBox="0 0 16 16"
            fill="none"
            style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s ease" }}
          >
            <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      {isOpen && (
        <div className="user-dropdown-menu">
          <div className="user-dropdown-header">
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1rem", color: "var(--ink)", marginBottom: "0.2rem" }}>
              {user?.name || "User"}
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--ink-muted)" }}>{user?.email || ""}</div>
            <div
              style={{
                marginTop: "0.65rem",
                fontSize: "0.65rem",
                padding: "0.25rem 0.6rem",
                background: isAdmin ? "var(--gold)" : "var(--ink)",
                color: isAdmin ? "var(--ink)" : "var(--paper)",
                display: "inline-block",
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase"
              }}
            >
              {roleLabel}
            </div>
          </div>

          <div style={{ padding: "0.4rem" }}>
            {isAdmin && (
              <button className="user-dropdown-menu-item" onClick={() => handleMenuClick("/admin")}>
                <span style={{ color: "var(--gold-deep)" }}>◆</span>
                <span>Admin Panel</span>
              </button>
            )}
            {userRole === "student" && (
              <button className="user-dropdown-menu-item" onClick={() => handleMenuClick("/export")}>
                <span style={{ color: "var(--gold-deep)" }}>↓</span>
                <span>Export PDF</span>
              </button>
            )}
            <button className="user-dropdown-menu-item" onClick={() => handleMenuClick("/settings")}>
              <span style={{ color: "var(--gold-deep)" }}>⚙</span>
              <span>Settings</span>
            </button>
          </div>

          <div style={{ padding: "0.4rem", borderTop: "1px solid var(--rule-soft)" }}>
            <button className="user-dropdown-menu-item sign-out" onClick={handleSignOut}>
              <span>→</span>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
