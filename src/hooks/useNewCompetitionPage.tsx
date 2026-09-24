import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { ArrowPathIcon, Square3Stack3DIcon } from "@heroicons/react/24/outline";
import { BracketIcon, CrownIcon, RotationIcon } from "@/lib/icons";
import { FORMATS, isRotationFormat, isSeriesFormat } from "@/lib/formats";
import type { PersistentTeam, TournamentFormat, TournamentSettings } from "@/types/game";
import {
  DEFAULT_POINTS_FOR_LOSS,
  DEFAULT_POINTS_FOR_WIN,
  DEFAULT_TERMINOLOGY,
} from "@/types/competition-config";

export type Step = "format" | "teams" | "name";

export type AdvancedSettings = {
  showAdvancedSettings: boolean;
  pointsForWin: number;
  pointsForLoss: number;
  venueName: string;
};

export type AdvancedSettingsHandlers = {
  onToggleAdvancedSettings: () => void;
  onPointsForWinChange: (value: number) => void;
  onPointsForLossChange: (value: number) => void;
  onVenueNameChange: (value: string) => void;
};

export interface FormatOption {
  type: TournamentFormat;
  label: string;
  description: string;
  icon: React.ReactNode;
  minTeams: number;
  gradient: string;
}

const formatOptions: FormatOption[] = [
  {
    type: "round_robin",
    label: FORMATS.round_robin.label,
    description: "Every team plays against every other team once. Best for leagues.",
    icon: <ArrowPathIcon className="w-7 h-7" />,
    minTeams: FORMATS.round_robin.minTeams,
    gradient: "from-emerald-500 to-green-600",
  },
  {
    type: "single_elimination",
    label: FORMATS.single_elimination.label,
    description: "Lose once and you're out. Fast and exciting tournament format.",
    icon: <BracketIcon className="w-7 h-7" />,
    minTeams: FORMATS.single_elimination.minTeams,
    gradient: "from-violet-500 to-purple-600",
  },
  {
    type: "double_elimination",
    label: FORMATS.double_elimination.label,
    description: "Must lose twice to be eliminated. More forgiving tournament format.",
    icon: <Square3Stack3DIcon className="w-7 h-7" />,
    minTeams: FORMATS.double_elimination.minTeams,
    gradient: "from-blue-500 to-indigo-600",
  },
  {
    type: "win2out",
    label: FORMATS.win2out.label,
    description: "True endless! Winner stays, win 2 = champion & back to queue. Track who gets crowned most!",
    icon: <CrownIcon className="w-7 h-7" />,
    minTeams: FORMATS.win2out.minTeams,
    gradient: "from-primary to-red-400",
  },
  {
    type: "two_match_rotation",
    label: FORMATS.two_match_rotation.label,
    description: "Play 2 matches then rotate. First match winner stays, then everyone gets 2 games before rotating.",
    icon: <RotationIcon className="w-7 h-7" />,
    minTeams: FORMATS.two_match_rotation.minTeams,
    gradient: "from-rose-500 to-pink-600",
  },
];

export const useNewCompetitionPage = () => {
  const router = useRouter();
  const { state, isRosterLoading, addTeam, createTournament } = useApp();
  const [step, setStep] = useState<Step>("format");
  const [selectedFormat, setSelectedFormat] = useState<TournamentFormat | null>(null);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [competitionName, setCompetitionName] = useState("");
  const [nameError, setNameError] = useState("");
  const [numberOfCourts, setNumberOfCourts] = useState(1);
  const [matchSeriesLength, setMatchSeriesLength] = useState(1);
  const [instantWinEnabled, setInstantWinEnabled] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [pointsForWin, setPointsForWin] = useState(DEFAULT_POINTS_FOR_WIN);
  const [pointsForLoss, setPointsForLoss] = useState(DEFAULT_POINTS_FOR_LOSS);
  const [venueName, setVenueName] = useState(DEFAULT_TERMINOLOGY.venue);

  const currentFormat = useMemo(
    () => formatOptions.find((f) => f.type === selectedFormat),
    [selectedFormat]
  );

  const allTeamIds = useMemo(() => state.teams.map((team) => team.id), [state.teams]);
  const allSelected = useMemo(() => {
    if (state.teams.length === 0) return false;
    return state.teams.every((team) => selectedTeamIds.includes(team.id));
  }, [state.teams, selectedTeamIds]);

  const isPowerOf2 = useCallback((n: number) => {
    return n > 0 && (n & (n - 1)) === 0;
  }, []);

  const nextPowerOf2 = useCallback((n: number) => {
    let power = 1;
    while (power < n) power *= 2;
    return power;
  }, []);

  const teamValidation = useMemo(() => {
    if (!currentFormat) return { valid: false, message: "" };

    const count = selectedTeamIds.length;
    if (count < currentFormat.minTeams) {
      return {
        valid: false,
        message: `Select at least ${currentFormat.minTeams} teams`,
      };
    }

    // For elimination formats, show bye info if not a power of 2
    if (
      (currentFormat.type === "single_elimination" ||
        currentFormat.type === "double_elimination") &&
      !isPowerOf2(count)
    ) {
      const bracketSize = nextPowerOf2(count);
      const byeCount = bracketSize - count;
      return {
        valid: true,
        message: `${count} teams selected (${byeCount} bye${byeCount > 1 ? "s" : ""})`,
      };
    }

    return { valid: true, message: `${count} teams selected` };
  }, [currentFormat, selectedTeamIds, isPowerOf2, nextPowerOf2]);

  const handleFormatSelect = useCallback((type: TournamentFormat) => {
    setSelectedFormat(type);
  }, []);

  const handleTeamToggle = useCallback((teamId: string) => {
    setSelectedTeamIds((prev) =>
      prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId]
    );
  }, []);

  const handleToggleSelectAll = useCallback(() => {
    setSelectedTeamIds(allSelected ? [] : allTeamIds);
  }, [allSelected, allTeamIds]);

  const handleNext = useCallback(() => {
    if (step === "format" && selectedFormat) {
      setStep("teams");
    } else if (step === "teams" && teamValidation.valid) {
      setStep("name");
    }
  }, [step, selectedFormat, teamValidation.valid]);

  const handleBackToCompetitions = useCallback(() => {
    router.push("/competitions");
  }, [router]);

  const handleCompetitionNameChange = useCallback((value: string) => {
    setCompetitionName(value);
    setNameError("");
  }, []);

  const handleBack = useCallback(() => {
    if (step === "teams") {
      setStep("format");
    } else if (step === "name") {
      setStep("teams");
    }
  }, [step]);

  const maxCourts = useMemo(() => {
    return Math.floor(selectedTeamIds.length / 2);
  }, [selectedTeamIds.length]);

  const handleCreateCompetition = useCallback(async () => {
    const trimmedName = competitionName.trim();
    if (!trimmedName) {
      setNameError("Competition name is required");
      return;
    }
    if (!selectedFormat || isCreating) return;

    // Entries follow the order the teams were ticked, which is the seed order.
    const teams = selectedTeamIds
      .map((id) => state.teams.find((team) => team.id === id))
      .filter((team): team is PersistentTeam => Boolean(team));

    const rotation = isRotationFormat(selectedFormat);
    const settings: TournamentSettings = {
      courts: rotation ? numberOfCourts : 1,
      seriesLength: isSeriesFormat(selectedFormat) ? matchSeriesLength : 1,
      instantWin: rotation ? instantWinEnabled : false,
      pointsForWin,
      pointsForLoss,
      terminology: {
        ...DEFAULT_TERMINOLOGY,
        venue: venueName,
        venuePlural: venueName + "s",
      },
    };

    setIsCreating(true);
    try {
      await createTournament({ name: trimmedName, format: selectedFormat, teams, settings });
      router.push("/competitions");
    } catch (error) {
      console.error("Failed to create the tournament:", error);
      setNameError(
        error instanceof Error ? error.message : "The tournament could not be created."
      );
    } finally {
      setIsCreating(false);
    }
  }, [
    competitionName,
    selectedFormat,
    selectedTeamIds,
    state.teams,
    numberOfCourts,
    matchSeriesLength,
    instantWinEnabled,
    pointsForWin,
    pointsForLoss,
    venueName,
    isCreating,
    createTournament,
    router,
  ]);

  const handleQuickCreateTeam = useCallback(() => {
    const teamNumber = state.teams.length + 1;
    addTeam(`Team ${teamNumber}`);
  }, [state.teams.length, addTeam]);

  return {
    competitionName,
    currentFormat,
    formatOptions,
    handleToggleSelectAll,
    handleBack,
    handleBackToCompetitions,
    handleCompetitionNameChange,
    handleCreateCompetition,
    handleFormatSelect,
    handleNext,
    handleQuickCreateTeam,
    handleTeamToggle,
    isCreating,
    maxCourts,
    nameError,
    numberOfCourts,
    allSelected,
    selectedFormat,
    selectedTeamIds,
    matchSeriesLength,
    instantWinEnabled,
    setNumberOfCourts,
    setMatchSeriesLength,
    setInstantWinEnabled,
    setSelectedTeamIds,
    setStep,
    step,
    teamValidation,
    teams: state.teams,
    teamsCount: state.teams.length,
    isRosterLoading,
    // Advanced settings (grouped)
    advancedSettings: {
      showAdvancedSettings,
      pointsForWin,
      pointsForLoss,
      venueName,
    } as AdvancedSettings,
    advancedSettingsHandlers: {
      onToggleAdvancedSettings: () => setShowAdvancedSettings((prev) => !prev),
      onPointsForWinChange: setPointsForWin,
      onPointsForLossChange: setPointsForLoss,
      onVenueNameChange: setVenueName,
    } as AdvancedSettingsHandlers,
  };
};
