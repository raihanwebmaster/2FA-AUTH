import { useEffect, useState } from "react";
import { Link, Navigate, Route, Routes } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import Profile from "./pages/Profile.jsx";
import { API_BASE } from "./lib/api.js";

function ProtectedRoute({ user, loading, children }) {
  if (loading) {
    return <div className="notice">Checking session...</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadUser() {
      try {
        const res = await fetch(`${API_BASE}/api/auth/me`, {
          credentials: "include"
        });
        if (!active) return;
        if (!res.ok) {
          setUser(null);
          return;
        }
        const data = await res.json();
        setUser(data.user);
      } catch {
        if (active) {
          setUser(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    loadUser();
    return () => {
      active = false;
    };
  }, []);

  function handleAuth(nextUser) {
    setUser(nextUser);
  }

  async function handleLogout() {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        credentials: "include"
      });
    } finally {
      setUser(null);
    }
  }

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>2FA AUTHENTICATOR</h1>
          <p>Sign up with email + password. Log in with username + password.</p>
        </div>
        <nav className="nav">
          {!user && (
            <>
              <Link to="/signup">Sign Up</Link>
              <Link to="/login">Login</Link>
            </>
          )}
          {user && (
            <>
              <Link to="/profile">Profile</Link>
              <button className="ghost" type="button" onClick={handleLogout}>
                Logout
              </button>
            </>
          )}
        </nav>
      </header>

      <main className="page">
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login onAuth={handleAuth} />} />
          <Route path="/signup" element={<Signup onAuth={handleAuth} />} />
          <Route
            path="/profile"
            element={
              <ProtectedRoute user={user} loading={loading}>
                <Profile user={user} onLogout={handleLogout} />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </main>
    </div>
  );
}
