import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="page page-home">
      <section className="home-hero">
        <div className="hero-copy">
          <div className="hero-highlights">
            <span className="highlight-pill">Software</span>
            <span className="highlight-pill">Operations</span>
            <span className="highlight-pill">HR</span>
            <span className="highlight-pill">Design</span>
            <span className="highlight-pill">Sales</span>
          </div>
          <span className="eyebrow">Organize your work</span>
          <h1>Projects, tasks, and teams in one place.</h1>
          <p>
            Build a lightweight Jira-like workspace for planning, tracking, and collaborating on every project.
          </p>

          <div className="hero-actions">
            <Link to="/login" className="button button-hero">
              Sign in
            </Link>
            <Link to="/register" className="button button-outline">
              Get started
            </Link>
          </div>
        </div>
      </section>

      <section className="home-features">
        <div className="feature-card">
          <h3>Kanban board</h3>
          <p>Drag tasks through stages with a clean board view.</p>
        </div>
        <div className="feature-card">
          <h3>Quick project setup</h3>
          <p>Create new projects and assign tasks in seconds.</p>
        </div>
        <div className="feature-card">
          <h3>Team tracker</h3>
          <p>See progress at a glance and keep everyone aligned.</p>
        </div>
      </section>
    </div>
  );
}
