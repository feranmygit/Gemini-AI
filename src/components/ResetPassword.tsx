import { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession();
  }, []);

  const handleUpdate = async () => {
    setError(null);
    setMessage(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      setMessage("Password updated successfully. You can now sign in.");
      setPassword("");
    }

    setLoading(false);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.82)",
        backdropFilter: "blur(10px)",
        padding: 20,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "linear-gradient(180deg, #151423 0%, #0f0e1a 100%)",
          border: "1px solid rgba(124,107,255,0.2)",
          borderRadius: 22,
          padding: 32,
          boxShadow: "0 24px 80px rgba(0,0,0,0.9)",
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 26, marginBottom: 8 }}>🔐</div>
          <h2
            style={{
              fontFamily: "'DM Serif Display', serif",
              fontSize: 22,
              color: "#e8e6f0",
              margin: 0,
            }}
          >
            Reset Password
          </h2>
          <p style={{ fontSize: 13, color: "#555", marginTop: 4 }}>
            Enter your new secure password
          </p>
        </div>

        {/* Success */}
        {message && (
          <div
            style={{
              marginBottom: 18,
              padding: "11px 14px",
              borderRadius: 10,
              background: "rgba(74,222,128,0.08)",
              border: "1px solid rgba(74,222,128,0.2)",
              fontSize: 13,
              color: "#86efac",
            }}
          >
            {message}
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            style={{
              marginBottom: 18,
              padding: "11px 14px",
              borderRadius: 10,
              background: "rgba(255,107,107,0.08)",
              border: "1px solid rgba(255,107,107,0.2)",
              fontSize: 13,
              color: "#ff9a9a",
            }}
          >
            ⚠ {error}
          </div>
        )}

        {/* Input */}
        <div style={{ marginBottom: 20 }}>
          <label
            style={{
              fontSize: 12,
              color: "#7c6bff",
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              display: "block",
              marginBottom: 6,
            }}
          >
            New Password
          </label>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            style={{
              width: "100%",
              padding: "11px 14px",
              boxSizing: "border-box",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 11,
              color: "#ddd9f0",
              fontSize: 14,
              outline: "none",
              fontFamily: "'DM Sans', sans-serif",
            }}
            onFocus={(e) =>
              (e.target.style.borderColor = "rgba(124,107,255,0.6)")
            }
            onBlur={(e) =>
              (e.target.style.borderColor = "rgba(255,255,255,0.1)")
            }
          />
        </div>

        {/* Button */}
        <button
          onClick={handleUpdate}
          disabled={loading}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: 12,
            border: "none",
            background: loading
              ? "rgba(124,107,255,0.3)"
              : "linear-gradient(135deg, #7c6bff, #b06bff)",
            color: loading ? "#666" : "#fff",
            fontSize: 15,
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            transition: "all 0.2s",
            boxShadow: loading
              ? "none"
              : "0 4px 20px rgba(124,107,255,0.45)",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {loading ? "Updating..." : "Update Password"}
        </button>
      </div>
    </div>
  );
}
