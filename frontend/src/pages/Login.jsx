import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../lib/api.js";

export default function Login({ onAuth }) {
  const navigate = useNavigate();
  const defaultUsername = import.meta.env.VITE_DEV_USERNAME || "";
  const defaultPassword = import.meta.env.VITE_DEV_PASSWORD || "";

  const [form, setForm] = useState({
    username: defaultUsername,
    password: defaultPassword
  });

  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);

  const [otpCode, setOtpCode] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
        credentials: "include"
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Login failed");
        return;
      }

      if (data.requiresTwoFactor) {
        setRequiresTwoFactor(true);
        setMessage(data.message || "Enter your 2FA code to continue");
        return;
      }

      onAuth(data.user);
      setMessage("Login successful");
      setForm({ username: "", password: "" });
      navigate("/profile");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyTwoFactor(event) {
    event.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);

    try {
      const body = useRecoveryCode
        ? { recoveryCode: recoveryCode.trim() }
        : { token: otpCode.trim() };

      const res = await fetch(`${API_BASE}/api/2fa/verify-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include"
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "2FA verification failed");
        return;
      }

      onAuth(data.user);
      setMessage("Login successful");
      setForm({ username: "", password: "" });
      setOtpCode("");
      setRecoveryCode("");
      setRequiresTwoFactor(false);
      navigate("/profile");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function cancelTwoFactor() {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        credentials: "include"
      });
    } catch {
      // The UI still exits the challenge state; the challenge cookie will expire.
    }

    setRequiresTwoFactor(false);
    setOtpCode("");
    setRecoveryCode("");
    setUseRecoveryCode(false);
    setMessage("");
    setError("");
  }

  return (
    <section className="card">
      <h2>Login</h2>

      {!requiresTwoFactor && (
        <form onSubmit={handleSubmit} className="form">
          <label>
            Username
            <input
              type="text"
              value={form.username}
              onChange={(event) =>
                setForm({ ...form, username: event.target.value })
              }
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={form.password}
              onChange={(event) =>
                setForm({ ...form, password: event.target.value })
              }
              required
            />
          </label>

          <button type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      )}

      {requiresTwoFactor && (
        <form onSubmit={handleVerifyTwoFactor} className="form">
          <h3>Two-Factor Verification</h3>

          {!useRecoveryCode && (
            <label>
              Authenticator Code
              <input
                type="text"
                value={otpCode}
                onChange={(event) => setOtpCode(event.target.value)}
                placeholder="Enter 6-digit code"
                required
              />
            </label>
          )}

          {useRecoveryCode && (
            <label>
              Recovery Code
              <input
                type="text"
                value={recoveryCode}
                onChange={(event) => setRecoveryCode(event.target.value)}
                placeholder="Enter recovery code"
                required
              />
            </label>
          )}

          <button type="submit" disabled={loading}>
            {loading ? "Verifying..." : "Verify & Continue"}
          </button>

          <button
            className="ghost"
            type="button"
            onClick={() => {
              setUseRecoveryCode(!useRecoveryCode);
              setOtpCode("");
              setRecoveryCode("");
              setError("");
              setMessage("");
            }}
          >
            {useRecoveryCode
              ? "Use authenticator code instead"
              : "Use recovery code instead"}
          </button>

          <button className="ghost" type="button" onClick={cancelTwoFactor}>
            Cancel
          </button>
        </form>
      )}

      {(message || error) && (
        <div className={error ? "notice error" : "notice success"}>
          {error || message}
        </div>
      )}
    </section>
  );
}
