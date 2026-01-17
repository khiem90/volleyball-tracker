// Main context and provider
export { AppProvider, useApp } from "./AppContext";
export { SessionProvider, useSession } from "./SessionContext";
export { AuthProvider, useAuth } from "./AuthContext";

// Domain-specific hooks
export { useTeams, type UseTeamsReturn } from "./useTeams";
export { useCompetitions, type UseCompetitionsReturn } from "./useCompetitions";
export { useMatches, type UseMatchesReturn } from "./useMatches";

// Reducer exports (for testing or advanced use cases)
export {
  appReducer,
  initialState,
  generateId,
  STORAGE_KEY,
  type AppAction,
} from "./appReducer";
