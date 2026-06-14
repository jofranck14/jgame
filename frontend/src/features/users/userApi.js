import api from "../../services/api";

// Users
export const getUserApi        = (id)    => api.get(`/users/${id}`);
export const updateMeApi       = (data)  => api.patch("/users/me", data);
export const uploadAvatarApi   = (form)  => api.patch("/users/me", form, { headers: { "Content-Type": "multipart/form-data" } });

// Jeux
export const listGamesApi      = ()      => api.get("/games");
export const getGameApi        = (id)    => api.get(`/games/${id}`);
export const createGameApi     = (data)  => api.post("/games", data);

// user_games (jeux choisis par le joueur)
export const getUserGamesApi   = (uid)   => api.get(`/users/${uid}/games`).catch(() => ({ data: { games: [] } }));
export const setUserGamesApi   = (data)  => api.post("/user-games", data).catch(() => ({}));

// Stats par jeu
export const getUserStatsApi   = (uid)   => api.get(`/results/leaderboard`).then(r => ({
  data: { stats: (r.data?.leaderboard || []).filter(p => String(p.user_id) === String(uid)) }
}));

// Matchmaking — filtre joueurs par jeu+ville+niveau
export const findPlayersApi    = (params) => api.get("/users", { params }).catch(() => ({ data: { users: [] } }));

// Reviews
export const getReviewsApi     = (orgId) => api.get(`/reviews/organizer/${orgId}`);
export const createReviewApi   = (data)  => api.post("/reviews", data);

// Reports
export const createReportApi   = (data)  => api.post("/reports", data);

// Results
export const getTournamentResultsApi = (tid) => api.get(`/results/${tid}`);
export const getLeaderboardApi       = ()    => api.get("/results/leaderboard");
export const getGameLeaderboardApi   = (gid) => api.get(`/results/leaderboard/${gid}`);

// Admin
export const adminGetUsersApi        = ()         => api.get("/users").catch(() => ({ data: { users: [] } }));
export const adminUpdateUserRoleApi  = (id, data) => api.patch(`/users/${id}/role`, data).catch(() => ({}));
export const adminBanUserApi         = (id)       => api.patch(`/users/${id}/ban`).catch(() => ({}));
export const adminDeleteUserApi      = (id)       => api.delete(`/users/${id}`).catch(() => ({}));
export const adminUpdateTournamentApi = (id, data) => api.patch(`/tournaments/${id}`, data).catch(() => ({}));
export const adminDeleteTournamentApi = (id)      => api.delete(`/tournaments/${id}`).catch(() => ({}));
export const adminSubmitResultsApi   = (data)     => api.post("/results", data);
export const adminVerifyPaymentApi   = (id)       => api.post(`/payments/${id}/verify`);
export const adminGetPaymentsApi     = ()         => api.get("/payments/admin").catch(() => ({ data: { payments: [] } }));
export const adminGetReportsApi      = ()         => api.get("/reports").catch(() => ({ data: { reports: [] } }));
export const adminResolveReportApi   = (id, data) => api.patch(`/reports/${id}`, data);
export const adminDeleteReviewApi    = (id)       => api.delete(`/reviews/${id}`).catch(() => ({}));