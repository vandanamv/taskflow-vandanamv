import { Route, Routes, useLocation } from "react-router-dom";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import { isAuthenticated } from "./store/auth";

export default function App() {
  const authenticated = isAuthenticated();
  const location = useLocation();
  const showSidebar = authenticated && location.pathname.startsWith("/projects");

  return (
    <div className={`app-shell ${showSidebar ? "app-shell-auth" : "app-shell-public"}`}>
      {showSidebar ? <Sidebar /> : <Navbar />}
      <main className={`page-wrapper ${showSidebar ? "page-wrapper-auth" : "page-wrapper-public"}`}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/projects"
            element={
              <ProtectedRoute>
                <Projects />
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:id"
            element={
              <ProtectedRoute>
                <ProjectDetail />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
    </div>
  );
}
