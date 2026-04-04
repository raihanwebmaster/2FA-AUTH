export default function Profile({ user, onLogout }) {
  return (
    <section className="card info">
      <h2>User Info</h2>
      <div className="info-row">
        <span>Username</span>
        <strong>{user?.username}</strong>
      </div>
      <div className="info-row">
        <span>Email</span>
        <strong>{user?.email}</strong>
      </div>
      <button className="ghost" type="button" onClick={onLogout}>
        Logout
      </button>
    </section>
  );
}
