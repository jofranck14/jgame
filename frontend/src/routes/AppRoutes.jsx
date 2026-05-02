import { Routes, Route, Navigate } from "react-router-dom";
import PrivateRoute     from "./PrivateRoute";
import Login            from "../pages/Login";
import Register         from "../pages/Register";
import Home             from "../pages/Home";
import TournamentsPage  from "../pages/TournamentsPage";
import Tournament       from "../pages/Tournament";
import Profile          from "../pages/Profile";
import Chat             from "../pages/Chat";
import Game             from "../pages/Game";
import GamesPage        from "../pages/GamesPage";
import CreateTournament from "../pages/CreateTournament";
import Admin            from "../pages/Admin";
import Leaderboard      from "../pages/Leaderboard";
import Matchmaking      from "../pages/Matchmaking";
import Notifications    from "../pages/Notifications";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login"    element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route path="/"                   element={<PrivateRoute><Home /></PrivateRoute>} />
      <Route path="/tournaments"        element={<PrivateRoute><TournamentsPage /></PrivateRoute>} />
      <Route path="/tournaments/create" element={<PrivateRoute><CreateTournament /></PrivateRoute>} />
      <Route path="/tournaments/:id"    element={<PrivateRoute><Tournament /></PrivateRoute>} />
      <Route path="/games"              element={<PrivateRoute><GamesPage /></PrivateRoute>} />
      <Route path="/games/:id"          element={<PrivateRoute><Game /></PrivateRoute>} />
      <Route path="/profile/:id"        element={<PrivateRoute><Profile /></PrivateRoute>} />
      <Route path="/chat/:userId"       element={<PrivateRoute><Chat /></PrivateRoute>} />
      <Route path="/leaderboard"        element={<PrivateRoute><Leaderboard /></PrivateRoute>} />
      <Route path="/matchmaking"        element={<PrivateRoute><Matchmaking /></PrivateRoute>} />
      <Route path="/notifications"      element={<PrivateRoute><Notifications /></PrivateRoute>} />
      <Route path="/admin"              element={<PrivateRoute><Admin /></PrivateRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}