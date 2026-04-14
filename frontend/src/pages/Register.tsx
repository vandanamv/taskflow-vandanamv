import { useState } from "react";
import { registerUser } from "../api/auth";
import { Link, useNavigate } from "react-router-dom";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await registerUser({ name, email, password });
      navigate("/login");
    } catch (err: any) {
      setError(err?.response?.data?.error || "Something went wrong");
    }
  };

  return (
    <div className="page page-center">
      <div className="card auth-card auth-glass">
        <div className="auth-hero">
          <h1>Create your workspace</h1>
          <p>Build projects, assign tasks, and track progress faster.</p>
        </div>

        <form onSubmit={handleSubmit} className="form-stack">
          <input
            className="input"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <input
            className="input"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            className="input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button type="submit" className="button button-hero">
            Create account
          </button>

          {error && <p className="form-error">{error}</p>}
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}