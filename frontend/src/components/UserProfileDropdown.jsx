import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { clearToken, apiFetch } from "../api/client";

export default function UserProfileDropdown({ userRole, isAdmin: propIsAdmin }) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(propIsAdmin || false);
  const dropdownRef = useRef(null);

  // Update isAdmin when prop changes
  useEffect(() => {
    if (propIsAdmin !== undefined) {
      setIsAdmin(propIsAdmin);
    }
  }, [propIsAdmin]);

  useEffect(() => {
    // Fetch user info
    const loadUser = async () => {
      try {
        const userData = await apiFetch("/api/auth/me");
        setUser(userData);
        
        // Always check admin status to ensure it's up to date
        // But use prop if provided as initial value
        try {
          const adminCheck = await apiFetch("/api/admin/check");
          const adminStatus = adminCheck.isAdmin || false;
          setIsAdmin(adminStatus);
          // Debug log (remove in production if needed)
          if (adminStatus) {
            console.log("✓ User is admin - Admin Panel will be shown");
          }
        } catch (err) {
          console.error("Admin check failed:", err);
          // If prop is provided, use it; otherwise set to false
          if (propIsAdmin !== undefined) {
            setIsAdmin(propIsAdmin);
          } else {
            setIsAdmin(false);
          }
        }
      } catch (err) {
        console.error("Failed to load user:", err);
      }
    };
    loadUser();

    // Close dropdown when clicking outside
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
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
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div ref={dropdownRef} style={{ position: "relative" }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          padding: "0.5rem 1rem",
          borderRadius: "0.5rem",
          border: "none",
          background: isOpen ? "var(--bg-tertiary)" : "transparent",
          cursor: "pointer",
          transition: "all 0.2s ease",
          color: "var(--text-primary)",
          fontSize: "0.9375rem",
          fontWeight: "500"
        }}
        onMouseEnter={(e) => {
          if (!isOpen) {
            e.currentTarget.style.background = "var(--bg-tertiary)";
          }
        }}
        onMouseLeave={(e) => {
          if (!isOpen) {
            e.currentTarget.style.background = "transparent";
          }
        }}
      >
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.875rem",
            fontWeight: "600",
            flexShrink: 0
          }}
        >
          {user ? getInitials(user.name) : "U"}
        </div>
        <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
          {user?.name || "User"}
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{
              transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s ease"
            }}
          >
            <path
              d="M4 6L8 10L12 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 0.5rem)",
            right: 0,
            background: "var(--bg-primary)",
            borderRadius: "0.75rem",
            boxShadow: "var(--shadow-lg)",
            border: "1px solid var(--border)",
            minWidth: "200px",
            overflow: "hidden",
            zIndex: 1000,
            animation: "fadeIn 0.2s ease"
          }}
        >
          {/* User Info Header */}
          <div
            style={{
              padding: "1rem",
              borderBottom: "1px solid var(--border-light)",
              background: "var(--bg-secondary)"
            }}
          >
            <div style={{ fontWeight: "600", fontSize: "0.9375rem", marginBottom: "0.25rem" }}>
              {user?.name || "User"}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
              {user?.email || ""}
            </div>
            <div
              style={{
                marginTop: "0.5rem",
                fontSize: "0.75rem",
                padding: "0.25rem 0.5rem",
                background: isAdmin ? "var(--warning)" : userRole === "parent" ? "#14b8a6" : "var(--primary)",
                color: "#fff",
                borderRadius: "0.25rem",
                display: "inline-block",
                fontWeight: "600"
              }}
            >
              {isAdmin ? "Admin" : userRole === "parent" ? "Parent" : "Student"}
            </div>
          </div>

          {/* Menu Items */}
          <div style={{ padding: "0.5rem" }}>
            {isAdmin && (
              <button
                onClick={() => handleMenuClick("/admin")}
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  textAlign: "left",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  borderRadius: "0.5rem",
                  color: "var(--text-primary)",
                  fontSize: "0.9375rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--bg-tertiary)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <span style={{ fontSize: "1.125rem" }}>🛡️</span>
                <span>Admin</span>
              </button>
            )}

            {userRole === "student" && (
              <button
                onClick={() => handleMenuClick("/export")}
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  textAlign: "left",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  borderRadius: "0.5rem",
                  color: "var(--text-primary)",
                  fontSize: "0.9375rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--bg-tertiary)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <span style={{ fontSize: "1.125rem" }}>📄</span>
                <span>Export</span>
              </button>
            )}

            <button
              onClick={() => handleMenuClick("/settings")}
              style={{
                width: "100%",
                padding: "0.75rem 1rem",
                textAlign: "left",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                borderRadius: "0.5rem",
                color: "var(--text-primary)",
                fontSize: "0.9375rem",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--bg-tertiary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <span style={{ fontSize: "1.125rem" }}>⚙️</span>
              <span>Settings</span>
            </button>
          </div>

          {/* Sign Out */}
          <div
            style={{
              padding: "0.5rem",
              borderTop: "1px solid var(--border-light)"
            }}
          >
            <button
              onClick={handleSignOut}
              style={{
                width: "100%",
                padding: "0.75rem 1rem",
                textAlign: "left",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                borderRadius: "0.5rem",
                color: "var(--error)",
                fontSize: "0.9375rem",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                transition: "all 0.2s ease",
                fontWeight: "600"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <span style={{ fontSize: "1.125rem" }}>🚪</span>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
