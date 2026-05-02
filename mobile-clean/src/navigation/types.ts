export type RootStackParamList = {
  Login:    undefined;
  Register: undefined;
  App:      undefined;
};

export type AppTabParamList = {
  Home:          undefined;
  Tournaments:   undefined;
  Games:         undefined;
  Leaderboard:   undefined;
  Profile:       undefined;
};

export type TournamentStackParamList = {
  TournamentList:   undefined;
  TournamentDetail: { id: number };
};

export type GameStackParamList = {
  GameList:   undefined;
  GameDetail: { id: number };
};

export type ProfileStackParamList = {
  MyProfile:    undefined;
  UserProfile:  { id: number };
  Matchmaking:  undefined;
  Notifications:undefined;
  Chat:         { userId: number; username: string };
};