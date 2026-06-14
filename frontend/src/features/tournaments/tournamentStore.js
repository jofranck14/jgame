import { create } from "zustand";

export const useTournamentStore = create((set) => ({
  tournaments: [],
  games: [],
  leaderboard: [],
  setTournaments: (tournaments) => set({ tournaments }),
  setGames: (games) => set({ games }),
  setLeaderboard: (leaderboard) => set({ leaderboard }),
}));