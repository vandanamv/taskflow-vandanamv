import api from "./axios";

export const getProjects = async () => {
  const res = await api.get("/projects");
  return res.data.projects || [];
};

export const createProject = async (data: {
  name: string;
  description?: string;
}) => {
  const res = await api.post("/projects", data);
  return res.data;
};

export const getProjectById = async (id: string) => {
  const res = await api.get(`/projects/${id}`);
  return res.data;
};

export const deleteProject = async (id: string) => {
  const res = await api.delete(`/projects/${id}`);
  return res.data;
};
