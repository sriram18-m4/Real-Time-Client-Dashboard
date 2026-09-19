import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/common/ProtectedRoute';

// Pages
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import { TasksPage } from './pages/TasksPage';
import { ClientsPage } from './pages/ClientsPage';
import { TeamPage } from './pages/TeamPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
      retry: (failureCount, error: any) => {
        // Don't retry on 401/403/404
        if ([401, 403, 404].includes(error?.response?.status)) return false;
        return failureCount < 2;
      },
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SocketProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Auth Route */}
              <Route path="/login" element={<LoginPage />} />

              {/* Protected App Routes */}
              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  {/* Dashboard: All Roles */}
                  <Route path="/" element={<DashboardPage />} />

                  {/* Projects: Admin & PM */}
                  <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'PROJECT_MANAGER']} />}>
                    <Route path="/projects" element={<ProjectsPage />} />
                  </Route>

                  {/* Project Detail Board: All authenticated roles (Dev views assigned project tasks) */}
                  <Route path="/projects/:id" element={<ProjectDetailPage />} />

                  {/* Tasks Board: All Roles */}
                  <Route path="/tasks" element={<TasksPage />} />

                  {/* Clients: Admin & PM */}
                  <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'PROJECT_MANAGER']} />}>
                    <Route path="/clients" element={<ClientsPage />} />
                  </Route>

                  {/* Team: Admin & PM */}
                  <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'PROJECT_MANAGER']} />}>
                    <Route path="/team" element={<TeamPage />} />
                  </Route>
                </Route>
              </Route>

              {/* Catch-all redirect */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </SocketProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
