import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createProject, deleteProject, getProjectById, getProjects } from "../api/projects";
import { useEffect } from "react";

interface ProjectCounts {
  todo: number;
  in_progress: number;
  done: number;
}

interface Project {
  id: string;
  name: string;
  description?: string;
  total_tasks?: number;
  counts?: ProjectCounts;
  tasks?: Array<{ status?: keyof ProjectCounts }>;
}

const projectColors = ["#2563eb", "#f97316", "#0891b2", "#0f766e", "#7c3aed", "#db2777"];
const statusConfig: Array<{ key: keyof ProjectCounts; label: string; className: string }> = [
  { key: "todo", label: "Todo", className: "status-pill-todo" },
  { key: "in_progress", label: "In Progress", className: "status-pill-progress" },
  { key: "done", label: "Done", className: "status-pill-done" },
];

const emptyCounts: ProjectCounts = {
  todo: 0,
  in_progress: 0,
  done: 0,
};

function buildProjectCounts(project: Project): Project {
  const counts = { ...emptyCounts };

  for (const task of project.tasks || []) {
    if (task.status && task.status in counts) {
      counts[task.status] += 1;
    }
  }

  return {
    ...project,
    total_tasks: project.tasks?.length ?? project.total_tasks ?? 0,
    counts,
  };
}

function notifyProjectsRefresh() {
  window.dispatchEvent(new Event("projects:refresh"));
}

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const data = await getProjects();
      const detailedProjects = await Promise.all(
        data.map(async (project: Project) => {
          try {
            const detail = await getProjectById(project.id);
            return buildProjectCounts({ ...project, tasks: detail.tasks || [] });
          } catch {
            return buildProjectCounts(project);
          }
        })
      );
      setProjects(detailedProjects);
      setError("");
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to fetch projects");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createProject({ name, description });
      setName("");
      setDescription("");
      setShowForm(false);
      await fetchProjects();
      notifyProjectsRefresh();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to create project");
    }
  };

  const handleDeleteProject = async (projectId: string, projectName: string) => {
    const confirmed = window.confirm(`Delete project "${projectName}"? This will remove its tasks too.`);
    if (!confirmed) {
      return;
    }

    try {
      await deleteProject(projectId);
      setProjects((current) => current.filter((project) => project.id !== projectId));
      notifyProjectsRefresh();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to delete project");
    }
  };

  return (
    <div className="page page-content projects-page">
      <div className="page-header page-header-inline">
        <div>
          <span className="eyebrow">Workspace</span>
          <h1>Projects</h1>
          <p className="page-subtitle">Scan project health, jump into any board, and spin up a fresh workspace without losing context.</p>
        </div>
        <button className="button button-hero" type="button" onClick={() => setShowForm((current) => !current)}>
          {showForm ? "Close" : "+ New Project"}
        </button>
      </div>

      {error && <p className="form-error">{error}</p>}

      {showForm && (
        <section className="card card-spaced project-form-card">
          <div className="section-heading">
            <h2>Create a new project</h2>
            <p>Give the team a clear space to track work.</p>
          </div>
          <form onSubmit={handleCreateProject} className="form-stack project-form">
            <div className="inline-form-grid">
              <input
                className="input"
                placeholder="Project name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <input
                className="input"
                placeholder="Short description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="project-form-actions">
              <button type="button" className="button button-outline" onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button type="submit" className="button button-hero">
                Create Project
              </button>
            </div>
          </form>
        </section>
      )}

      {loading ? (
        <div className="projects-grid">
          {[0, 1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="project-grid-card skeleton-project-card">
              <div className="skeleton-line skeleton-line-icon" />
              <div className="skeleton-line skeleton-line-title" />
              <div className="skeleton-line skeleton-line-body" />
              <div className="project-status-row">
                <div className="skeleton-pill" />
                <div className="skeleton-pill" />
                <div className="skeleton-pill" />
              </div>
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <section className="empty-state empty-state-panel">
          <div className="empty-state-mark">PM</div>
          <h3>No projects yet</h3>
          <p>Start with one project and this workspace will turn into your navigation, health dashboard, and kanban hub.</p>
          <button className="button button-hero" type="button" onClick={() => setShowForm(true)}>
            Create your first project
          </button>
        </section>
      ) : (
        <div className="projects-grid">
          {projects.map((project, index) => (
            <article
              key={project.id}
              className="project-grid-card"
              onClick={() => navigate(`/projects/${project.id}`)}
            >
              <div className="project-card-header">
                <div className="project-card-heading">
                  <span className="project-icon" style={{ backgroundColor: projectColors[index % projectColors.length] }}>
                    {project.name.slice(0, 1).toUpperCase()}
                  </span>
                  <div>
                    <h3>{project.name}</h3>
                    <p className="project-card-count">{project.total_tasks || 0} total tasks</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="icon-button icon-button-danger"
                  aria-label={`Delete ${project.name}`}
                  title="Delete project"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteProject(project.id, project.name);
                  }}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="icon-button-svg">
                    <path
                      d="M9 3h6l1 2h4v2H4V5h4l1-2zm1 6h2v8h-2V9zm4 0h2v8h-2V9zM7 9h2v8H7V9zm1 11h8a2 2 0 0 0 2-2V7H6v11a2 2 0 0 0 2 2z"
                      fill="currentColor"
                    />
                  </svg>
                </button>
              </div>
              <p className="project-description">{project.description || "No description yet. Open the board to start planning tasks."}</p>
              <div className="project-status-row">
                {statusConfig.map((status) => (
                  <span key={status.key} className={`status-pill ${status.className}`}>
                    {status.label} {project.counts?.[status.key] || 0}
                  </span>
                ))}
              </div>
              <div className="project-card-footer">
                <span className="project-open-link">Open board</span>
                <span className="arrow">&gt;</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
