import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiFetch, clearToken } from "../api/client";

export default function Settings() {
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [status, setStatus] = useState("");
  
  // Password reset state
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [passwordStatus, setPasswordStatus] = useState("");

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setPasswordStatus("");
    
    // Validation
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordStatus("Please fill in all fields");
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      setPasswordStatus("New password must be at least 6 characters long");
      return;
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordStatus("New passwords do not match");
      return;
    }
    
    if (passwordData.currentPassword === passwordData.newPassword) {
      setPasswordStatus("New password must be different from current password");
      return;
    }
    
    try {
      await apiFetch("/api/auth/password", {
        method: "PUT",
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });
      setPasswordStatus("Password updated successfully!");
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
      setTimeout(() => {
        setShowPasswordReset(false);
        setPasswordStatus("");
      }, 2000);
    } catch (err) {
      setPasswordStatus(err.message || "Failed to update password");
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "DELETE") {
      setStatus("Please type 'DELETE' to confirm");
      return;
    }

    if (!window.confirm("Are you absolutely sure? This will permanently delete your account and all associated data. This action cannot be undone.")) {
      return;
    }

    try {
      await apiFetch("/api/auth/me", {
        method: "DELETE",
        body: JSON.stringify({ confirm: "DELETE" })
      });
      setStatus("Account deleted successfully. Redirecting...");
      clearToken();
      window.dispatchEvent(new Event("auth-change"));
      setTimeout(() => navigate("/"), 2000);
    } catch (err) {
      setStatus(err.message || "Failed to delete account");
    }
  };

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto" }}>
      <div className="card">
        <h1 style={{ fontSize: "2rem", fontWeight: "700", marginBottom: "1rem" }}>Account Settings</h1>
        
        {/* Privacy Section */}
        <div style={{ marginBottom: "2rem", paddingBottom: "2rem", borderBottom: "1px solid var(--border-light)" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "1rem" }}>Privacy & Data</h2>
          <p className="muted" style={{ marginBottom: "1rem" }}>
            You have control over your personal data. You can request to delete your account and all associated data at any time.
          </p>
        </div>

        {/* Password Reset Section */}
        <div style={{ marginBottom: "2rem", paddingBottom: "2rem", borderBottom: "1px solid var(--border-light)" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "1rem" }}>Change Password</h2>
          <p className="muted" style={{ marginBottom: "1rem" }}>
            Update your account password. Make sure to use a strong password that you haven't used before.
          </p>
          
          {!showPasswordReset ? (
            <button
              className="button"
              onClick={() => setShowPasswordReset(true)}
              style={{ background: "var(--primary)", color: "#fff" }}
            >
              Change Password
            </button>
          ) : (
            <form onSubmit={handlePasswordReset} className="card" style={{ background: "var(--bg-secondary)", padding: "1.5rem" }}>
              <h3 style={{ fontSize: "1.125rem", fontWeight: "700", marginBottom: "1rem" }}>
                Reset Password
              </h3>
              
              <div className="input" style={{ marginBottom: "1rem" }}>
                <label>
                  Current Password <span style={{ color: "var(--error)" }}>*</span>
                </label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  placeholder="Enter your current password"
                  required
                  autoComplete="current-password"
                />
              </div>
              
              <div className="input" style={{ marginBottom: "1rem" }}>
                <label>
                  New Password <span style={{ color: "var(--error)" }}>*</span>
                </label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  placeholder="Enter new password (min. 6 characters)"
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
                <small className="muted" style={{ display: "block", marginTop: "0.25rem" }}>
                  Password must be at least 6 characters long
                </small>
              </div>
              
              <div className="input" style={{ marginBottom: "1rem" }}>
                <label>
                  Confirm New Password <span style={{ color: "var(--error)" }}>*</span>
                </label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  placeholder="Confirm new password"
                  required
                  autoComplete="new-password"
                />
              </div>
              
              {passwordStatus && (
                <p style={{ 
                  marginBottom: "1rem", 
                  color: passwordStatus.includes("success") ? "var(--success)" : "var(--error)", 
                  fontWeight: "600" 
                }}>
                  {passwordStatus}
                </p>
              )}
              
              <div style={{ display: "flex", gap: "1rem" }}>
                <button
                  type="submit"
                  className="button"
                  style={{ background: "var(--primary)", color: "#fff", flex: 1 }}
                >
                  Update Password
                </button>
                <button
                  type="button"
                  className="button ghost"
                  onClick={() => {
                    setShowPasswordReset(false);
                    setPasswordData({
                      currentPassword: "",
                      newPassword: "",
                      confirmPassword: ""
                    });
                    setPasswordStatus("");
                  }}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Delete Account Section */}
        <div style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "1rem", color: "var(--error)" }}>
            Delete Account
          </h2>
          <p className="muted" style={{ marginBottom: "1rem" }}>
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
          
          {!showDeleteConfirm ? (
            <button
              className="button"
              onClick={() => setShowDeleteConfirm(true)}
              style={{ background: "var(--error)", color: "#fff" }}
            >
              Delete My Account
            </button>
          ) : (
            <div className="card" style={{ background: "rgba(239, 68, 68, 0.05)", border: "2px solid var(--error)", padding: "1.5rem" }}>
              <h3 style={{ fontSize: "1.125rem", fontWeight: "700", marginBottom: "1rem", color: "var(--error)" }}>
                Confirm Account Deletion
              </h3>
              <p style={{ marginBottom: "1rem", fontWeight: "600" }}>
                This will permanently delete:
              </p>
              <ul style={{ marginBottom: "1.5rem", paddingLeft: "1.5rem" }}>
                <li>Your user account</li>
                <li>All student/parent profile data</li>
                <li>All academic records, test scores, activities, and awards</li>
                <li>All uploaded documents</li>
                <li>All essays and AI reports</li>
                <li>All chat history</li>
              </ul>
              <div className="input" style={{ marginBottom: "1rem" }}>
                <label>
                  Type <strong>DELETE</strong> to confirm:
                </label>
                <input
                  type="text"
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  placeholder="DELETE"
                  style={{ fontFamily: "monospace", fontWeight: "700" }}
                />
              </div>
              <div style={{ display: "flex", gap: "1rem" }}>
                <button
                  className="button"
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirm !== "DELETE"}
                  style={{ background: "var(--error)", color: "#fff", flex: 1 }}
                >
                  Permanently Delete Account
                </button>
                <button
                  className="button ghost"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteConfirm("");
                    setStatus("");
                  }}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
              </div>
              {status && (
                <p style={{ marginTop: "1rem", color: status.includes("success") ? "var(--success)" : "var(--error)", fontWeight: "600" }}>
                  {status}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Data Consent Info */}
        <div className="card" style={{ background: "var(--bg-secondary)", padding: "1.5rem" }}>
          <h3 style={{ fontSize: "1.125rem", fontWeight: "700", marginBottom: "0.75rem" }}>Data Processing Consent</h3>
          <p className="muted" style={{ fontSize: "0.875rem", lineHeight: "1.6" }}>
            By using MyEduPort, you consent to the processing of your data for:
          </p>
          <ul style={{ marginTop: "0.75rem", paddingLeft: "1.5rem", fontSize: "0.875rem" }}>
            <li>Providing personalized university recommendations and guidance</li>
            <li>Improving AI models and services</li>
            <li>Generating gap analysis and portfolio insights</li>
          </ul>
          <p className="muted" style={{ fontSize: "0.875rem", marginTop: "0.75rem" }}>
            You can withdraw consent at any time by deleting your account. See our{" "}
            <Link to="/privacy" style={{ color: "var(--primary)", textDecoration: "underline" }}>
              Privacy Policy
            </Link>{" "}
            for more details.
          </p>
        </div>
      </div>
    </div>
  );
}
