import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import FeedbackProvider from "./components/Feedback/FeedbackProvider";

import ProtectedLayout from "./components/Layout/ProtectedRoute";
import PublicRoute from "./components/Layout/PublicRoute";
import AdminLayout from "./components/Layout/AdminLayout";

import LandingPage from "./pages/LandingPage";
import Login from "./pages/Auth/Login";
import Register from "./pages/Auth/Register";
import Dashboard from "./pages/User/Dashboard/Dashboard";
import Fields from "./pages/User/Fields/Fields";
import CropsPage from "./pages/User/Crops/Crops";
import DiseaseLogs from "./pages/User/DiseaseLogs/DiseaseLogs";
import AIScan from "./pages/User/AIScan/AIScan";
import AIChat from "./pages/User/AIChat/AIChat";
import Account from "./pages/User/Account/Account";
import AdminOverview from "./pages/Admin/AdminOverview/AdminOverview";
import AdminUsers from "./pages/Admin/AdminUsers/AdminUsers";
import AdminFields from "./pages/Admin/AdminFields/AdminFields";
import AdminSeasons from "./pages/Admin/AdminSeasons/AdminSeasons";
import AdminSeasonDetails from "./pages/Admin/AdminSeasonDetails/AdminSeasonDetails";
import AdminTasks from "./pages/Admin/AdminTasks/AdminTasks";

function App() {
  return (
    <AuthProvider>
      <FeedbackProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<PublicRoute />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
            </Route>

            <Route element={<ProtectedLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/fields" element={<Fields />} />
              <Route path="/crops" element={<CropsPage />} />
              <Route path="/disease-logs" element={<DiseaseLogs />} />
              <Route path="/ai-scan" element={<AIScan />} />
              <Route path="/ask-ai" element={<AIChat />} />
              <Route path="/account" element={<Account />} />
            </Route>

            <Route element={<AdminLayout />}>
              <Route path="/admin" element={<AdminOverview />} />
              <Route path="/admin/fields" element={<AdminFields />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/seasons" element={<AdminSeasons />} />
              <Route path="/admin/season-details" element={<AdminSeasonDetails />} />
              <Route path="/admin/tasks" element={<AdminTasks />} />
            </Route>

            <Route path="*" element={<Navigate to="/login" />} />
          </Routes>
        </BrowserRouter>
      </FeedbackProvider>
    </AuthProvider>
  );
}

export default App;
