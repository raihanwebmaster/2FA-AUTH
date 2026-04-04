import { useEffect, useState } from "react";
import { Link, Navigate, Route, Routes } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import Profile from "./pages/Profile.jsx";

const USER_KEY = "twofa_authenticator_user";

function ProtectedRoute({ user, children }) {
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem(USER_KEY);
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem(USER_KEY);
      }
    }
  }, []);

  function handleAuth(nextUser) {
    setUser(nextUser);
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
  }

  function handleLogout() {
    setUser(null);
    localStorage.removeItem(USER_KEY);
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
              <ProtectedRoute user={user}>
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
