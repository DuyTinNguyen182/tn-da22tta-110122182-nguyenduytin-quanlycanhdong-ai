import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import FeedbackProvider from "./components/Feedback/FeedbackProvider";

import ProtectedLayout from "./components/Layout/ProtectedRoute";
import PublicRoute from "./components/Layout/PublicRoute";
import AdminLayout from "./components/Layout/AdminLayout";
import ScrollToTopButton from "./components/Layout/ScrollToTopButton";

import LandingPage from "./pages/LandingPage";
import Login from "./pages/Auth/Login";
import Register from "./pages/Auth/Register";
import Dashboard from "./pages/User/Dashboard/Dashboard";
import Fields from "./pages/User/Fields/Fields";
import CropsPage from "./pages/User/Crops/Crops";
import DiseaseLogs from "./pages/User/DiseaseLogs/DiseaseLogs";
import Announcements from "./pages/User/Announcements/Announcements";
import SeasonRecommendations from "./pages/User/SeasonRecommendations/SeasonRecommendations";
import AIScan from "./pages/User/AIScan/AIScan";
import AIChat from "./pages/User/AIChat/AIChat";
import Account from "./pages/User/Account/Account";
import AdminOverview from "./pages/Admin/AdminOverview/AdminOverview";
import AdminUsers from "./pages/Admin/AdminUsers/AdminUsers";
import AdminFields from "./pages/Admin/AdminFields/AdminFields";
import AdminSeasons from "./pages/Admin/AdminSeasons/AdminSeasons";
import AdminSeasonDetails from "./pages/Admin/AdminSeasonDetails/AdminSeasonDetails";
import AdminSeasonRecommendations from "./pages/Admin/AdminSeasonRecommendations/AdminSeasonRecommendations";
import AdminAnnouncements from "./pages/Admin/AdminAnnouncements/AdminAnnouncements";
import AdminTasks from "./pages/Admin/AdminTasks/AdminTasks";
import AdminTaskDetails from "./pages/Admin/AdminTaskDetails/AdminTaskDetails";

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
              <Route path="/announcements" element={<Announcements />} />
              <Route path="/season-recommendations" element={<SeasonRecommendations />} />
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
              <Route
                path="/admin/season-recommendations"
                element={<AdminSeasonRecommendations />}
              />
              <Route path="/admin/announcements" element={<AdminAnnouncements />} />
              <Route path="/admin/tasks" element={<AdminTasks />} />
              <Route path="/admin/task-details" element={<AdminTaskDetails />} />
            </Route>

            <Route path="*" element={<Navigate to="/login" />} />
          </Routes>
          <ScrollToTopButton />
        </BrowserRouter>
      </FeedbackProvider>
    </AuthProvider>
  );
}

export default App;
