import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { logout, isAuthenticated } from "../store/auth";
import { getProjectById, getProjects } from "../api/projects";

interface Project {
  id: string;
  name: string;
  description?: string;
  total_tasks?: number;
  tasks?: Array<{ status?: string }>;
}

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const authenticated = isAuthenticated();
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const projectColors = ["#2563eb", "#f97316", "#0891b2", "#0f766e", "#7c3aed", "#db2777"];

  const userEmail = useMemo(() => {
    if (!token) {
      return "workspace@taskflow.app";
    }

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.email || "workspace@taskflow.app";
    } catch {
      return "workspace@taskflow.app";
    }
  }, [token]);

  const fetchProjects = async () => {
    try {
      const data = await getProjects();
      const detailedProjects = await Promise.all(
        data.map(async (project: Project) => {
          try {
            const detail = await getProjectById(project.id);
            return {
              ...project,
              total_tasks: detail.tasks?.length ?? project.total_tasks ?? 0,
            };
          } catch {
            return project;
          }
        })
      );
      setProjects(detailedProjects);
    } catch {
      console.error("Failed to fetch projects for sidebar");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authenticated) {
      return;
    }

    fetchProjects();

    const handleProjectsRefresh = () => {
      setLoading(true);
      fetchProjects();
    };

    window.addEventListener("projects:refresh", handleProjectsRefresh);
    return () => window.removeEventListener("projects:refresh", handleProjectsRefresh);
  }, [authenticated]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (!authenticated) {
    return null;
  }

  const userInitials = userEmail.slice(0, 2).toUpperCase();

  return (
    <aside className={`sidebar ${expanded ? "sidebar-expanded" : "sidebar-collapsed"}`}>
      <div className="sidebar-header">
        <Link to="/projects" className="sidebar-brand">
          <span className="sidebar-brand-mark">TF</span>
          {expanded && (
            <span className="sidebar-brand-copy">
              <strong>TaskFlow</strong>
              <small>Project hub</small>
            </span>
          )}
        </Link>
        <button
          type="button"
          className="sidebar-toggle"
          onClick={() => setExpanded(!expanded)}
          title={expanded ? "Collapse" : "Expand"}
          aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
        >
          {expanded ? (
            <svg viewBox="0 0 24 24" aria-hidden="true" className="icon-button-svg">
              <path d="M11 6 5 12l6 6 1.4-1.4L7.8 12l4.6-4.6zM19 6l-6 6 6 6 1.4-1.4-4.6-4.6 4.6-4.6z" fill="currentColor" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden="true" className="icon-button-svg">
              <path d="m5 6-1.4 1.4L8.2 12l-4.6 4.6L5 18l6-6zm8 0-1.4 1.4 4.6 4.6-4.6 4.6L13 18l6-6z" fill="currentColor" />
            </svg>
          )}
        </button>
      </div>

      <nav className="sidebar-nav">
        <Link
          to="/projects"
          className={`sidebar-link ${location.pathname.startsWith("/projects") ? "active" : ""}`}
          title="Projects"
        >
          <span className="sidebar-icon">P</span>
          {expanded && <span>Projects</span>}
        </Link>
      </nav>

      <div className="sidebar-projects">
        {expanded && <h3>Projects</h3>}
        {loading ? (
          <div className="sidebar-loading">Loading projects...</div>
        ) : projects.length === 0 ? (
          <div className="sidebar-empty">Create a project to pin it here.</div>
        ) : (
          <div className="sidebar-project-list">
            {projects.map((project, index) => (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                className={`sidebar-project ${location.pathname === `/projects/${project.id}` ? "active" : ""}`}
                title={project.name}
              >
                <span
                  className="sidebar-project-icon"
                  style={{ backgroundColor: projectColors[index % projectColors.length] }}
                >
                  {project.name[0].toUpperCase()}
                </span>
                {expanded && (
                  <span className="sidebar-project-copy">
                    <span className="sidebar-project-name">{project.name}</span>
                    <small>{project.total_tasks || 0} tasks</small>
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="sidebar-footer">
        <div className="sidebar-user-card" title={userEmail}>
          <span className="sidebar-user-avatar">{userInitials}</span>
          {expanded && (
            <span className="sidebar-user-copy">
              <strong>Signed in</strong>
              <small>{userEmail}</small>
            </span>
          )}
        </div>
        <button className="sidebar-logout" onClick={handleLogout} title="Logout" type="button">
          <span className="sidebar-icon">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="icon-button-svg">
              <path
                d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4v-2H6V6h4V4zm5.6 3.4L14.2 8.8l2.8 2.7H9v2h8l-2.8 2.7 1.4 1.4L21 12l-5.4-5.6z"
                fill="currentColor"
              />
            </svg>
          </span>
          {expanded && <span>Log out</span>}
        </button>
      </div>
    </aside>
  );
}
