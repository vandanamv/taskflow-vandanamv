import api from "./axios";

export const registerUser = (data: {
  name: string;
  email: string;
  password: string;
}) => {
  return api.post("/auth/register", data);
};

export const loginUser = (data: {
  email: string;
  password: string;
}) => {
  return api.post("/auth/login", data);
};

export const setToken = (token: string) => {
  localStorage.setItem("token", token);
};

export const getToken = () => {
  return localStorage.getItem("token");
};

export const logout = () => {
  localStorage.removeItem("token");
};