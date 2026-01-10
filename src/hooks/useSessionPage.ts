import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useSession } from "@/context/SessionContext";
import { useAuth } from "@/context/AuthContext";
import type { RoundRobinStanding, PersistentTeam, Match } from "@/types/game";

export const useSessionPage = () => {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const shareCode = params.shareCode as string;
  const adminTokenFromUrl = searchParams.get("admin");

  const {
    session,
    role,
    isLoading,
    error,
    joinSession,
    leaveSession,
    applyAdminToken,
    canEdit,
    isCreator,
  } = useSession();
  const { user, isConfigured } = useAuth();

  const [showAuth, setShowAuth] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (shareCode && !hasJoined && isConfigured) {
      setHasJoined(true);
      joinSession(shareCode).then((success) => {
        if (!success) {
          // Session not found, handled by error state
        }
      });
    }
  }, [shareCode, hasJoined, joinSession, isConfigured]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (adminTokenFromUrl && session && !canEdit) {
      const success = applyAdminToken(adminTokenFromUrl);
      if (success) {
        router.replace(`/session/${shareCode}`);
      }
    }
  }, [adminTokenFromUrl, session, canEdit, applyAdminToken, router, shareCode]);

  const handleLeaveSession = useCallback(() => {
    leaveSession();
    router.push("/");
  }, [leaveSession, router]);

  const teamsMap = useMemo(() => {
    const map = new Map<string, PersistentTeam>();
    if (session?.teams) {
      session.teams.forEach((team) => map.set(team.id, team));
    }
    return map;
  }, [session]);

  const standings = useMemo((): RoundRobinStanding[] | null => {
    if (!session?.competition || session.competition.type !== "round_robin") {
      return null;
    }

    const standingsMap = new Map<string, RoundRobinStanding>();

    session.competition.teamIds.forEach((teamId) => {
      standingsMap.set(teamId, {
        teamId,
        played: 0,
        won: 0,
        lost: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        pointsDiff: 0,
        competitionPoints: 0,
      });
    });

    const completedMatches = (session.matches || []).filter(
      (m) => m.competitionId === session.competition?.id && m.status === "completed"
    );

    completedMatches.forEach((match) => {
      const homeStanding = standingsMap.get(match.homeTeamId);
      const awayStanding = standingsMap.get(match.awayTeamId);

      if (homeStanding && awayStanding) {
        homeStanding.played++;
        awayStanding.played++;
        homeStanding.pointsFor += match.homeScore;
        homeStanding.pointsAgainst += match.awayScore;
        awayStanding.pointsFor += match.awayScore;
        awayStanding.pointsAgainst += match.homeScore;

        if (match.homeScore > match.awayScore) {
          homeStanding.won++;
          homeStanding.competitionPoints += 3;
          awayStanding.lost++;
        } else {
          awayStanding.won++;
          awayStanding.competitionPoints += 3;
          homeStanding.lost++;
        }

        homeStanding.pointsDiff = homeStanding.pointsFor - homeStanding.pointsAgainst;
        awayStanding.pointsDiff = awayStanding.pointsFor - awayStanding.pointsAgainst;
      }
    });

    return Array.from(standingsMap.values()).sort((a, b) => {
      if (b.competitionPoints !== a.competitionPoints) {
        return b.competitionPoints - a.competitionPoints;
      }
      return b.pointsDiff - a.pointsDiff;
    });
  }, [session]);

  const competition = session?.competition || null;
  const matches = session?.matches || [];
  const teams = session?.teams || [];

  const pendingMatches = matches.filter((m) => m.status === "pending");
  const inProgressMatches = matches.filter((m) => m.status === "in_progress");
  const completedMatches = matches.filter((m) => m.status === "completed");

  const handleMatchClick = useCallback(
    (match: Match) => {
      router.push(`/match/${match.id}`);
    },
    [router]
  );

  return {
    canEdit,
    competition,
    completedMatches,
    error,
    handleLeaveSession,
    handleMatchClick,
    inProgressMatches,
    isConfigured,
    isCreator,
    isLoading,
    matches,
    pendingMatches,
    role,
    session,
    setShowAuth,
    shareCode,
    showAuth,
    standings,
    teams,
    teamsMap,
    user,
  };
};
