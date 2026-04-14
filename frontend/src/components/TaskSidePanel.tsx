import { useEffect, useState } from "react";

export type TaskStatus = "todo" | "in_progress" | "done";

export interface TaskPanelData {
  id?: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority?: string;
  due_date?: string;
  assignee_id?: string;
}

export interface AssigneeOption {
  value: string;
  label: string;
}

interface TaskSidePanelProps {
  isOpen: boolean;
  mode: "create" | "edit";
  projectName?: string;
  task: TaskPanelData | null;
  assigneeOptions: AssigneeOption[];
  saving?: boolean;
  onClose: () => void;
  onSave: (task: TaskPanelData) => void;
  onDelete: (taskId: string) => void;
}

const statusOptions: Array<{ value: TaskStatus; label: string }> = [
  { value: "todo", label: "Todo" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
];

const emptyTask: TaskPanelData = {
  title: "",
  description: "",
  status: "todo",
  priority: "medium",
  due_date: "",
  assignee_id: "",
};

export default function TaskSidePanel({
  isOpen,
  mode,
  projectName,
  task,
  assigneeOptions,
  saving = false,
  onClose,
  onSave,
  onDelete,
}: TaskSidePanelProps) {
  const [formData, setFormData] = useState<TaskPanelData>(emptyTask);

  useEffect(() => {
    if (task) {
      setFormData({ ...emptyTask, ...task });
    }
  }, [task]);

  const handleChange = (field: keyof TaskPanelData, value: string) => {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  if (!isOpen || !task) {
    return null;
  }

  return (
    <>
      <button type="button" className="panel-backdrop" onClick={onClose} aria-label="Close task panel" />
      <aside className="task-side-panel" aria-label="Task details panel">
        <div className="panel-header">
          <div>
            <p className="panel-kicker">{projectName || "Project board"}</p>
            <h2>{mode === "create" ? "Create task" : "Task details"}</h2>
          </div>
          <button className="panel-close" onClick={onClose} type="button" aria-label="Close task panel">
            x
          </button>
        </div>

        <form className="panel-content" onSubmit={handleSubmit}>
          <div className="panel-section">
            <label htmlFor="task-title">Title</label>
            <input
              id="task-title"
              type="text"
              className="input"
              value={formData.title}
              onChange={(e) => handleChange("title", e.target.value)}
              placeholder="What needs to happen?"
              required
            />
          </div>

          <div className="panel-section">
            <label htmlFor="task-description">Description</label>
            <textarea
              id="task-description"
              className="input textarea"
              value={formData.description || ""}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Add notes, context, or a quick checklist..."
              rows={5}
            />
          </div>

          <div className="panel-section">
            <label>Status</label>
            <div className="status-segmented-control">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`status-segment ${formData.status === option.value ? "active" : ""}`}
                  onClick={() => handleChange("status", option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="panel-grid">
            <div className="panel-section">
              <label htmlFor="task-priority">Priority</label>
              <select
                id="task-priority"
                className="input"
                value={formData.priority || ""}
                onChange={(e) => handleChange("priority", e.target.value)}
              >
                <option value="">None</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div className="panel-section">
              <label htmlFor="task-due-date">Due date</label>
              <input
                id="task-due-date"
                type="date"
                className="input"
                value={formData.due_date || ""}
                onChange={(e) => handleChange("due_date", e.target.value)}
              />
            </div>
          </div>

          <div className="panel-section">
            <label htmlFor="task-assignee">Assignee</label>
            <select
              id="task-assignee"
              className="input"
              value={formData.assignee_id || ""}
              onChange={(e) => handleChange("assignee_id", e.target.value)}
            >
              <option value="">Unassigned</option>
              {assigneeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="panel-footer">
            {mode === "edit" && formData.id ? (
              <button type="button" className="button button-danger" onClick={() => onDelete(formData.id!)}>
                Delete Task
              </button>
            ) : (
              <span className="panel-helper-text">Tasks open here so the team keeps board context while editing.</span>
            )}
            <div className="panel-actions">
              <button type="button" className="button button-outline" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="button button-hero" disabled={saving}>
                {saving ? "Saving..." : mode === "create" ? "Create Task" : "Save Changes"}
              </button>
            </div>
          </div>
        </form>
      </aside>
    </>
  );
}
