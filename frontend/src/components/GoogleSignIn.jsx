import React, { useEffect, useRef } from "react";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function GoogleSignIn({ onSuccess, onError, disabled }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !containerRef.current || disabled) return;

    const initGoogleSignIn = () => {
      if (typeof window.google === "undefined" || !window.google?.accounts?.id) {
        setTimeout(initGoogleSignIn, 100);
        return;
      }

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => {
          if (response.credential) {
            onSuccess(response.credential);
          }
        },
        auto_select: false
      });

      window.google.accounts.id.renderButton(containerRef.current, {
        theme: "outline",
        size: "large",
        type: "standard",
        text: "continue_with",
        shape: "rectangular",
        width: 320
      });
    };

    initGoogleSignIn();
  }, [GOOGLE_CLIENT_ID, disabled, onSuccess]);

  return (
    <div className="google-signin-wrapper" style={{ marginTop: "1rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
        <div style={{ flex: 1, height: 1, background: "var(--border, #ddd)" }} />
        <span className="muted" style={{ fontSize: "0.875rem" }}>or</span>
        <div style={{ flex: 1, height: 1, background: "var(--border, #ddd)" }} />
      </div>
      <div ref={containerRef} style={{ display: "flex", justifyContent: "center", minHeight: "44px" }} />
      {!GOOGLE_CLIENT_ID && (
        <div
          style={{
            padding: "0.75rem 1rem",
            background: "var(--bg-secondary, #f5f5f5)",
            borderRadius: "8px",
            fontSize: "0.8125rem",
            color: "var(--muted, #666)",
            textAlign: "center"
          }}
        >
          Add <code style={{ background: "#eee", padding: "0.1em 0.4em", borderRadius: "4px" }}>VITE_GOOGLE_CLIENT_ID</code> to frontend <code>.env</code> to enable Google Sign-In.
        </div>
      )}
    </div>
  );
}
