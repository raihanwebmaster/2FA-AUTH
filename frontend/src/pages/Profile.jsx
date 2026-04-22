import { useState } from "react";

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
  const [isModalOpen, setIsModalOpen] = useState(false); // Add state for modal

  const openPopup = () => {
    setIsModalOpen(true); // Open modal
  };

  const closeModal = () => {
    setIsModalOpen(false); // Close modal
  };

  const handleToggle2FA = () => {
    // Add logic here to enable/disable 2FA (e.g., API call)
    // For now, just toggle the user state (assuming you have a way to update it)
    // user.twoFactorEnabled = !user.twoFactorEnabled; // Example
    closeModal();
  };

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
        {/* <strong>{user?.twoFactorEnabled ? "Enabled" : "Disabled"}</strong> */}
        <button className="ghost" type="button" onClick={() => openPopup()}>
          {user?.twoFactorEnabled ? "Disable" : "Enable"}
        </button>
      </div>
      <button className="ghost" type="button" onClick={onLogout}>
        Logout
      </button>



      {/* Add modal rendering */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>{user?.twoFactorEnabled ? "Disable" : "Enable"} 2FA</h3>
            <p>Are you sure you want to {user?.twoFactorEnabled ? "disable" : "enable"} 2FA?</p>
            {/* Add more content here, e.g., QR code for setup */}
            <div className="modal-buttons">
              <button onClick={handleToggle2FA}>Confirm</button>
              <button onClick={closeModal}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
