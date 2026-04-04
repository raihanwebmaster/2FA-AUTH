import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../lib/api.js";

export default function Signup({ onAuth }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: ""
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
        credentials: "include"
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Registration failed");
        return;
      }
      onAuth(data.user);
      setMessage("Account created successfully");
      setForm({ username: "", email: "", password: "" });
      navigate("/profile");
    } catch {
      setError("Network error");
    }
  }

  return (
    <section className="card">
      <h2>Create Account</h2>
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
          Email
          <input
            type="email"
            value={form.email}
            onChange={(event) =>
              setForm({ ...form, email: event.target.value })
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
        <button type="submit">Sign Up</button>
      </form>
      {(message || error) && (
        <div className={error ? "notice error" : "notice success"}>
          {error || message}
        </div>
      )}
    </section>
  );
}
