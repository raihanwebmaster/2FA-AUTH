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
  const openPopup = () => { };

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
        <button className="ghost" type="button" onClick={()=>openPopup()}>
          {user?.twoFactorEnabled ? "Disable" : "Enable"}
        </button>
      </div>
      <button className="ghost" type="button" onClick={onLogout}>
        Logout
      </button>
    </section>
  );
}
