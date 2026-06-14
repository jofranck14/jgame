import api from "../../services/api";

// Tournois
export const listTournamentsApi   = ()          => api.get("/tournaments");
export const getTournamentApi     = (id)        => api.get(`/tournaments/${id}`);
export const joinTournamentApi    = (id)        => api.post(`/tournaments/${id}/join`);
export const createTournamentApi  = (data)      => api.post("/tournaments", data);
export const updateTournamentApi  = (id, data)  => api.patch(`/tournaments/${id}`, data);
export const deleteTournamentApi  = (id)        => api.delete(`/tournaments/${id}`);

// Jeux
export const listGamesApi         = ()          => api.get("/games");
export const getGameApi           = (id)        => api.get(`/games/${id}`);
export const createGameApi        = (data)      => api.post("/games", data);
export const updateGameApi        = (id, data)  => api.patch(`/games/${id}`, data);
export const deleteGameApi        = (id)        => api.delete(`/games/${id}`);

// Leaderboard / Résultats
export const getLeaderboardApi    = ()          => api.get("/results/leaderboard");
export const getGameLeaderboard   = (gameId)    => api.get(`/results/leaderboard/${gameId}`);
export const getTournamentResults = (id)        => api.get(`/results/${id}`);
export const submitResultsApi     = (data)      => api.post("/results", data);

// Jeux utilisateur — POST /users/:id/games  |  DELETE /users/:id/games/:gameId
export const getUserGamesApi     = (userId)           => api.get(`/users/${userId}/games`);
export const addUserGameApi      = (userId, gameId)   => api.post(`/users/${userId}/games`, { game_id: gameId });
export const removeUserGameApi   = (userId, gameId)   => api.delete(`/users/${userId}/games/${gameId}`);

// Matchmaking
export const findPlayersApi       = (params)    => api.get("/users", { params });

// Reviews
export const getReviewsApi        = (orgId)     => api.get(`/reviews/organizer/${orgId}`);
export const createReviewApi      = (data)      => api.post("/reviews", data);

// Reports
export const createReportApi      = (data)      => api.post("/reports", data);
export const getReportsApi        = ()          => api.get("/reports");
export const updateReportApi      = (id, s)     => api.patch(`/reports/${id}`, { status: s });

// Paiements admin
export const getAdminPaymentsApi  = ()          => api.get("/payments/admin");
export const verifyPaymentApi     = (id)        => api.post(`/payments/${id}/verify`);

// Utilisateurs admin  →  PATCH /users/:id  gère role ET is_banned
export const getAllUsersApi        = ()          => api.get("/users");
export const updateUserAdminApi   = (id, data)  => api.patch(`/users/${id}`, data);
export const deleteUserApi        = (id)        => api.delete(`/users/${id}`);

// Notifications
export const getNotificationsApi  = ()          => api.get("/notifications");
export const markNotifReadApi     = (id)        => api.patch(`/notifications/${id}/read`);
export const markAllReadApi       = ()          => api.patch("/notifications/read-all");
export const sendAnnouncementApi  = (data)      => api.post("/notifications/announce", data);