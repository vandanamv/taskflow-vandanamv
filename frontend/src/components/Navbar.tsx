import { Link, useLocation, useNavigate } from "react-router-dom";
import { logout, isAuthenticated } from "../store/auth";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const authenticated = isAuthenticated();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="navbar">
      <Link to="/" className="navbar-brand">
        TaskFlow
      </Link>

      <div className="navbar-items">
        {authenticated ? (
          <>
            <Link
              to="/projects"
              className={`navbar-link ${location.pathname === "/projects" ? "active" : ""}`}
            >
              Projects
            </Link>
            <button className="button button-secondary" onClick={handleLogout}>
              Logout
            </button>
          </>
        ) : (
          <>
            <Link
              to="/login"
              className={`navbar-link ${location.pathname === "/login" ? "active" : ""}`}
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className={`button button-outline ${location.pathname === "/register" ? "active" : ""}`}
            >
              Create workspace
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
