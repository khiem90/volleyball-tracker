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

  const competition = session?.competition || null;
  const matches = useMemo(() => {
    const sessionMatches = session?.matches || [];
    if (!competition) {
      return sessionMatches;
    }
    if (competition.matchIds && competition.matchIds.length > 0) {
      const matchIdSet = new Set(competition.matchIds);
      return sessionMatches.filter((match) => matchIdSet.has(match.id));
    }
    return sessionMatches.filter(
      (match) => match.competitionId === competition.id
    );
  }, [session, competition]);
  const teams = session?.teams || [];

  const standings = useMemo((): RoundRobinStanding[] | null => {
    if (!competition || competition.type !== "round_robin") {
      return null;
    }

    const standingsMap = new Map<string, RoundRobinStanding>();

    competition.teamIds.forEach((teamId) => {
      standingsMap.set(teamId, {
        teamId,
        played: 0,
        won: 0,
        lost: 0,
        tied: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        pointsDiff: 0,
        competitionPoints: 0,
      });
    });

    const completedMatches = matches.filter((m) => m.status === "completed");

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

        // Get points from competition config or use defaults
        const pointsForWin = competition.config?.pointsForWin ?? 3;
        const pointsForTie = competition.config?.pointsForTie ?? 1;
        const pointsForLoss = competition.config?.pointsForLoss ?? 0;

        if (match.homeScore > match.awayScore) {
          homeStanding.won++;
          homeStanding.competitionPoints += pointsForWin;
          awayStanding.lost++;
          awayStanding.competitionPoints += pointsForLoss;
        } else if (match.awayScore > match.homeScore) {
          awayStanding.won++;
          awayStanding.competitionPoints += pointsForWin;
          homeStanding.lost++;
          homeStanding.competitionPoints += pointsForLoss;
        } else {
          // Tie
          homeStanding.tied++;
          awayStanding.tied++;
          homeStanding.competitionPoints += pointsForTie;
          awayStanding.competitionPoints += pointsForTie;
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
  }, [competition, matches]);

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
