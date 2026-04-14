import api from "./axios";

export const getTasks = async (projectId: string) => {
  const res = await api.get(`/projects/${projectId}/tasks`);
  return res.data.tasks || [];
};

export const createTask = async (
  projectId: string,
  data: {
    title: string;
    description?: string;
    status?: string;
    priority?: string;
    assignee_id?: string;
    due_date?: string;
  }
) => {
  const res = await api.post(`/projects/${projectId}/tasks`, data);
  return res.data;
};

export const updateTask = async (taskId: string, data: any) => {
  const res = await api.patch(`/tasks/${taskId}`, data);
  return res.data;
};

export const deleteTask = async (taskId: string) => {
  const res = await api.delete(`/tasks/${taskId}`);
  return res.data;
};
