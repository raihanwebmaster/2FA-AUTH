import { useEffect, useState } from "react";
import { API_BASE } from "../lib/api.js";

function getInitials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function Profile({ user, onLogout }) {
  const initials = getInitials(user?.username || "User");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);

  const [qrDataUrl, setQrDataUrl] = useState("");
  const [manualKey, setManualKey] = useState("");
  const [token, setToken] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [message, setMessage] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadTwoFactorStatus();
  }, []);

  async function loadTwoFactorStatus() {
    try {
      setStatusLoading(true);

      const res = await fetch(`${API_BASE}/api/2fa/status`, {
        credentials: "include"
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "Failed to load 2FA status");
        return;
      }

      setTwoFactorEnabled(!!data.enabled);
    } catch {
      setMessage("Failed to load 2FA status");
    } finally {
      setStatusLoading(false);
    }
  }

  function resetModalState() {
    setToken("");
    setQrDataUrl("");
    setManualKey("");
  }

  function openPopup() {
    setMessage("");
    resetModalState();
    setIsModalOpen(true);

    if (!twoFactorEnabled) {
      handleSetup();
    }
  }

  function closeModal() {
    setIsModalOpen(false);
    resetModalState();
  }

  async function handleSetup() {
    try {
      setActionLoading(true);
      setMessage("");

      const res = await fetch(`${API_BASE}/api/2fa/setup`, {
        method: "POST",
        credentials: "include"
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "Failed to start 2FA setup");
        return;
      }

      setQrDataUrl(data.qrDataUrl || "");
      setManualKey(data.manualKey || "");
    } catch {
      setMessage("Something went wrong while starting 2FA setup");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleVerify2FA() {
    try {
      setActionLoading(true);
      setMessage("");

      const res = await fetch(`${API_BASE}/api/2fa/verify-setup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({ token })
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "Invalid code");
        return;
      }

      setTwoFactorEnabled(true);
      setRecoveryCodes(data.recoveryCodes || []);
      setMessage(data.message || "2FA enabled successfully");

      // ✅ close modal after success
      closeModal();

    } catch {
      setMessage("Something went wrong while verifying 2FA");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDisable2FA() {
    try {
      setActionLoading(true);
      setMessage("");

      const res = await fetch(`${API_BASE}/api/2fa/disable`, {
        method: "POST",
        credentials: "include"
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "Failed to disable 2FA");
        return;
      }

      setTwoFactorEnabled(false);
      setRecoveryCodes([]);
      setMessage(data.message || "2FA disabled successfully");

      closeModal();
    } catch {
      setMessage("Something went wrong while disabling 2FA");
    } finally {
      setActionLoading(false);
    }
  }

  function downloadRecoveryCodes() {
    if (!recoveryCodes.length) return;

    const content =
      "Recovery Codes\n\n" +
      "Keep these codes safe. Each code can be used only once.\n\n" +
      recoveryCodes.join("\n");

    const blob = new Blob([content], {
      type: "text/plain;charset=utf-8"
    });

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "recovery-codes.txt";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }

  return (
    <section className="card info profile-card">
      <div className="profile-header">
        <div className="avatar">{initials}</div>
        <div className="profile-meta">
          <h2>User Info</h2>
          <p>Welcome back, {user?.username}</p>
        </div>
      </div>

      <div className="info-row">
        <span>Username</span>
        <strong>{user?.username}</strong>
      </div>

      <div className="info-row">
        <span>Email</span>
        <strong>{user?.email}</strong>
      </div>

      <div className="info-row">
        <span>Two-Factor Authentication</span>
        <strong>
          {statusLoading ? "Checking..." : twoFactorEnabled ? "Enabled" : "Disabled"}
        </strong>
      </div>

      <div className="info-row">
        <span>Manage 2FA</span>
        <button className="ghost" type="button" onClick={openPopup}>
          {twoFactorEnabled ? "Disable" : "Enable"}
        </button>
      </div>

      <button className="ghost" type="button" onClick={onLogout}>
        Logout
      </button>

      {message && (
        <div className="notice success" style={{ marginTop: "16px" }}>
          {message}
        </div>
      )}

      {/* ✅ Only download button, no list */}
      {recoveryCodes.length > 0 && (
        <div style={{ marginTop: "20px" }}>
          <button className="ghost" type="button" onClick={downloadRecoveryCodes}>
            Download Recovery Codes
          </button>
        </div>
      )}

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            {!twoFactorEnabled ? (
              <>
                <h3>Enable 2FA</h3>
                <p>
                  Scan the QR code with Google Authenticator or use the manual key.
                </p>

                {actionLoading && !qrDataUrl ? <p>Preparing QR code...</p> : null}

                {qrDataUrl && (
                  <div style={{ marginTop: "16px" }}>
                    <img
                      src={qrDataUrl}
                      alt="2FA QR"
                      style={{
                        width: "220px",
                        height: "220px",
                        display: "block",
                        margin: "0 auto 16px"
                      }}
                    />

                    <p>
                      <strong>Manual Key:</strong> {manualKey}
                    </p>

                    <input
                      type="text"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      placeholder="Enter 6-digit code"
                      style={{
                        width: "100%",
                        padding: "10px",
                        marginTop: "12px",
                        marginBottom: "12px"
                      }}
                    />

                    <div className="modal-buttons">
                      <button
                        type="button"
                        onClick={handleVerify2FA}
                        disabled={actionLoading || !token.trim()}
                      >
                        {actionLoading ? "Verifying..." : "Verify & Enable"}
                      </button>

                      <button type="button" onClick={closeModal}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <h3>Disable 2FA</h3>
                <p>Are you sure you want to disable two-factor authentication?</p>

                <div className="modal-buttons">
                  <button
                    type="button"
                    onClick={handleDisable2FA}
                    disabled={actionLoading}
                  >
                    {actionLoading ? "Disabling..." : "Confirm Disable"}
                  </button>

                  <button type="button" onClick={closeModal}>
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}