import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { createTask, deleteTask, updateTask } from "../api/tasks";
import { getProjectById } from "../api/projects";
import TaskSidePanel from "../components/TaskSidePanel";
import type { AssigneeOption, TaskPanelData, TaskStatus } from "../components/TaskSidePanel";

interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority?: string;
  due_date?: string;
  assignee_id?: string;
}

interface Project {
  id: string;
  name: string;
  description?: string;
  tasks?: Task[];
}

const statusOrder: TaskStatus[] = ["todo", "in_progress", "done"];
const statusLabels: Record<TaskStatus, string> = {
  todo: "Todo",
  in_progress: "In Progress",
  done: "Done",
};

function getTokenUser() {
  const token = localStorage.getItem("token");

  if (!token) {
    return { email: "", userId: "" };
  }

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return {
      email: payload.email || "",
      userId: payload.user_id || "",
    };
  } catch {
    return { email: "", userId: "" };
  }
}

function normalizeDateValue(date?: string) {
  if (!date) {
    return "";
  }

  const match = date.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) {
    return match[1];
  }

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toISOString().slice(0, 10);
}

function formatDate(date?: string) {
  if (!date) {
    return "No due date";
  }

  const normalizedDate = normalizeDateValue(date);
  if (!normalizedDate) {
    return "No due date";
  }

  return new Date(`${normalizedDate}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isOverdue(date?: string) {
  if (!date) {
    return false;
  }

  const normalizedDate = normalizeDateValue(date);
  if (!normalizedDate) {
    return false;
  }

  const dueDate = new Date(`${normalizedDate}T00:00:00`);
  const today = new Date();
  dueDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return dueDate < today;
}

function formatAssigneeLabel(value?: string, assigneeMap?: Map<string, string>) {
  if (!value) {
    return "Unassigned";
  }

  const mappedLabel = assigneeMap?.get(value);
  if (mappedLabel) {
    return mappedLabel;
  }

  if (value.includes("@")) {
    return value;
  }

  if (value.length > 8) {
    return `User ${value.slice(0, 8)}`;
  }

  return value;
}

function getInitials(value?: string, assigneeMap?: Map<string, string>) {
  const label = formatAssigneeLabel(value, assigneeMap);

  if (label === "Unassigned") {
    return "NA";
  }

  return label
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function createDraftTask(status: TaskStatus, assigneeId = ""): TaskPanelData {
  return {
    title: "",
    description: "",
    status,
    priority: "medium",
    due_date: "",
    assignee_id: assigneeId,
  };
}

function notifyProjectsRefresh() {
  window.dispatchEvent(new Event("projects:refresh"));
}

function normalizeTask(task: Task | TaskPanelData): Task {
  return {
    id: task.id || "",
    title: task.title,
    description: task.description || "",
    status: task.status,
    priority: task.priority || "",
    due_date: normalizeDateValue(task.due_date),
    assignee_id: task.assignee_id || "",
  };
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelMode, setPanelMode] = useState<"create" | "edit">("edit");
  const [selectedTask, setSelectedTask] = useState<TaskPanelData | null>(null);
  const [createStatus, setCreateStatus] = useState<TaskStatus>("todo");
  const [savingTask, setSavingTask] = useState(false);
  const currentUser = getTokenUser();

  useEffect(() => {
    if (id) {
      fetchProject();
    }
  }, [id]);

  const assigneeOptions = useMemo<AssigneeOption[]>(() => {
    const options = new Map<string, AssigneeOption>();

    if (currentUser.userId) {
      options.set(currentUser.userId, {
        value: currentUser.userId,
        label: "Me",
      });
    }

    for (const task of tasks) {
      if (!task.assignee_id || options.has(task.assignee_id)) {
        continue;
      }

      options.set(task.assignee_id, {
        value: task.assignee_id,
        label: formatAssigneeLabel(task.assignee_id),
      });
    }

    return Array.from(options.values());
  }, [currentUser.email, currentUser.userId, tasks]);

  const assigneeMap = useMemo(
    () => new Map(assigneeOptions.map((option) => [option.value, option.label])),
    [assigneeOptions]
  );

  const fetchProject = async () => {
    try {
      setLoading(true);
      const data = await getProjectById(id!);
      setProject(data);
      setTasks(
        (data.tasks || []).map((task: Task) => ({
          ...task,
          due_date: normalizeDateValue(task.due_date),
        }))
      );
      setError("");
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to fetch project");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenTaskPanel = (task: Task) => {
    setPanelMode("edit");
    setCreateStatus(task.status);
    setSelectedTask({
      id: task.id,
      title: task.title,
      description: task.description || "",
      status: task.status,
      priority: task.priority || "",
      due_date: normalizeDateValue(task.due_date),
      assignee_id: task.assignee_id || "",
    });
    setPanelOpen(true);
  };

  const handleCreateTask = (status: TaskStatus) => {
    setPanelMode("create");
    setCreateStatus(status);
    setSelectedTask(createDraftTask(status, currentUser.userId));
    setPanelOpen(true);
  };

  const handleClosePanel = () => {
    setPanelOpen(false);
    setSelectedTask(null);
  };

  const handleSaveTask = async (taskData: TaskPanelData) => {
    try {
      setSavingTask(true);
      if (panelMode === "create") {
        const createdTask = await createTask(id!, {
          title: taskData.title,
          description: taskData.description,
          priority: taskData.priority,
          status: taskData.status || createStatus,
          assignee_id: taskData.assignee_id,
          due_date: taskData.due_date,
        });
        setTasks((current) => [...current, normalizeTask(createdTask)]);
      } else if (taskData.id) {
        await updateTask(taskData.id, {
          title: taskData.title,
          description: taskData.description,
          status: taskData.status,
          priority: taskData.priority,
          due_date: taskData.due_date,
          assignee_id: taskData.assignee_id,
        });
        setTasks((current) =>
          current.map((task) => (task.id === taskData.id ? normalizeTask(taskData) : task))
        );
      }

      notifyProjectsRefresh();
      handleClosePanel();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to save task");
    } finally {
      setSavingTask(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      setTasks((current) => current.filter((task) => task.id !== taskId));
      notifyProjectsRefresh();
      handleClosePanel();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to delete task");
    }
  };

  const handleStatusChange = async (taskId: string, nextStatus: TaskStatus) => {
    const previousTasks = tasks;

    setTasks((current) =>
      current.map((task) => (task.id === taskId ? { ...task, status: nextStatus } : task))
    );
    setSelectedTask((current) => (current?.id === taskId ? { ...current, status: nextStatus } : current));

    try {
      await updateTask(taskId, { status: nextStatus });
      notifyProjectsRefresh();
    } catch (err: any) {
      setTasks(previousTasks);
      setSelectedTask((current) => {
        const original = previousTasks.find((task) => task.id === current?.id);
        return original
          ? {
              id: original.id,
              title: original.title,
              description: original.description || "",
              status: original.status,
              priority: original.priority || "",
              due_date: original.due_date || "",
              assignee_id: original.assignee_id || "",
            }
          : current;
      });
      setError(err?.response?.data?.error || "Failed to update task status");
    }
  };

  if (loading) {
    return (
      <div className="page page-content">
        <div className="page-header page-header-inline">
          <div>
            <div className="skeleton-line skeleton-line-title short" />
            <div className="skeleton-line skeleton-line-body medium" />
          </div>
        </div>
        <div className="board-grid">
          {statusOrder.map((status) => (
            <section key={status} className="board-column board-column-skeleton">
              <div className="board-title">
                <div className="skeleton-line skeleton-line-title short" />
                <div className="skeleton-pill" />
              </div>
              <div className="board-column-body">
                {[0, 1, 2].map((item) => (
                  <div key={item} className="task-card task-card-skeleton">
                    <div className="skeleton-line skeleton-line-title" />
                    <div className="skeleton-line skeleton-line-body" />
                    <div className="project-status-row">
                      <div className="skeleton-pill" />
                      <div className="skeleton-pill" />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    );
  }

  if (!project) {
    return <div className="page page-center">Project not found</div>;
  }

  const totalTasks = tasks.length;
  const todoCount = tasks.filter((task) => task.status === "todo").length;
  const inProgressCount = tasks.filter((task) => task.status === "in_progress").length;
  const doneCount = tasks.filter((task) => task.status === "done").length;

  return (
    <div className="page page-content board-page">
      <div className="page-header page-header-inline board-header">
        <div>
          <span className="eyebrow">Project board</span>
          <h1>{project.name}</h1>
          <p className="page-subtitle">{project.description || "Track work across a clean kanban board and update task details without losing your place."}</p>
        </div>
        <div className="project-meta project-meta-pills">
          <span className="status-pill status-pill-neutral">{totalTasks} tasks</span>
          <span className="status-pill status-pill-todo">Todo {todoCount}</span>
          <span className="status-pill status-pill-progress">In Progress {inProgressCount}</span>
          <span className="status-pill status-pill-done">Done {doneCount}</span>
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}

      {tasks.length === 0 ? (
        <section className="empty-state empty-state-panel empty-state-board">
          <div className="empty-state-mark">KB</div>
          <h3>This project is ready for its first task</h3>
          <p>Create a task directly into Todo and the kanban board will take over from there.</p>
          <button className="button button-hero" type="button" onClick={() => handleCreateTask("todo")}>
            Create first task
          </button>
        </section>
      ) : (
        <div className="board-grid">
          {statusOrder.map((columnStatus) => {
            const columnTasks = tasks.filter((task) => task.status === columnStatus);

            return (
              <section key={columnStatus} className={`board-column board-column-${columnStatus}`}>
                <div className="board-title">
                  <div>
                    <span>{statusLabels[columnStatus]}</span>
                    <p>{columnTasks.length} tasks</p>
                  </div>
                </div>

                <div className="board-column-body">
                  {columnTasks.length === 0 ? (
                    <div className="task-empty">No tasks here yet.</div>
                  ) : (
                    columnTasks.map((task) => (
                      <article key={task.id} className="task-card" onClick={() => handleOpenTaskPanel(task)}>
                        {(() => {
                          const currentIndex = statusOrder.indexOf(task.status);
                          const previousStatus = currentIndex > 0 ? statusOrder[currentIndex - 1] : null;
                          const nextStatus = currentIndex < statusOrder.length - 1 ? statusOrder[currentIndex + 1] : null;

                          return (
                            <>
                        <div className="task-card-top">
                          <div className="task-card-copy">
                            <div className="task-title-row">
                              <h3>{task.title}</h3>
                              {task.priority ? (
                                <span className={`priority-badge priority-${task.priority}`}>{task.priority}</span>
                              ) : null}
                            </div>
                            {task.description && <p>{task.description}</p>}
                          </div>
                          <div className="task-status-controls" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              className="task-status-arrow"
                              disabled={!previousStatus}
                              aria-label="Move task backward"
                              onClick={() => previousStatus && handleStatusChange(task.id, previousStatus)}
                            >
                              <svg viewBox="0 0 24 24" aria-hidden="true" className="icon-button-svg">
                                <path d="M15.5 5 9 11.5 15.5 18l1.4-1.4-5.1-5.1 5.1-5.1z" fill="currentColor" />
                              </svg>
                            </button>
                            <span className={`status-chip status-${task.status}`}>{statusLabels[task.status]}</span>
                            <button
                              type="button"
                              className="task-status-arrow"
                              disabled={!nextStatus}
                              aria-label="Move task forward"
                              onClick={() => nextStatus && handleStatusChange(task.id, nextStatus)}
                            >
                              <svg viewBox="0 0 24 24" aria-hidden="true" className="icon-button-svg">
                                <path d="m8.5 5-1.4 1.4 5.1 5.1-5.1 5.1L8.5 18l6.5-6.5z" fill="currentColor" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        <div className="task-card-footer">
                          <span className={`task-due ${task.due_date && isOverdue(task.due_date) ? "task-due-overdue" : ""}`}>
                            {formatDate(task.due_date)}
                          </span>
                          <span className="task-assignee">
                            <span className="task-avatar">{getInitials(task.assignee_id, assigneeMap)}</span>
                            <span>{formatAssigneeLabel(task.assignee_id, assigneeMap)}</span>
                          </span>
                        </div>
                            </>
                          );
                        })()}
                      </article>
                    ))
                  )}
                </div>

                <button className="button button-ghost add-task-button" type="button" onClick={() => handleCreateTask(columnStatus)}>
                  + Add task
                </button>
              </section>
            );
          })}
        </div>
      )}

      <TaskSidePanel
        key={`${panelMode}-${selectedTask?.id || "new"}-${selectedTask?.status || createStatus}`}
        isOpen={panelOpen}
        mode={panelMode}
        projectName={project.name}
        task={selectedTask}
        assigneeOptions={assigneeOptions}
        saving={savingTask}
        onClose={handleClosePanel}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
      />
    </div>
  );
}
