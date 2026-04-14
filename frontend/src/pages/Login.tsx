import { useState } from "react";
import { loginUser } from "../api/auth";
import { Link, useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await loginUser({ email, password });

      localStorage.setItem("token", res.data.token);

      navigate("/projects");
    } catch (err: any) {
      setError(err?.response?.data?.error || "Login failed");
    }
  };

  return (
    <div className="page page-center">
      <div className="card auth-card auth-glass">
        <div className="auth-hero">
          <h1>Welcome back</h1>
          <p>Sign in to manage projects, tasks, and progress in one place.</p>
        </div>

        <form onSubmit={handleSubmit} className="form-stack">
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
            Sign in
          </button>

          {error && <p className="form-error">{error}</p>}
        </form>

        <p className="auth-footer">
          New here? <Link to="/register">Create an account</Link>
        </p>
      </div>
    </div>
  );
}