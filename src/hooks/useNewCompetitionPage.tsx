import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { ArrowPathIcon, Square3Stack3DIcon } from "@heroicons/react/24/outline";
import { BracketIcon, CrownIcon, RotationIcon } from "@/lib/icons";
import type { CompetitionType } from "@/types/game";
import type { CompetitionConfig } from "@/types/competition-config";
import { DEFAULT_COMPETITION_CONFIG } from "@/types/competition-config";

export type Step = "format" | "teams" | "name";

export interface FormatOption {
  type: CompetitionType;
  label: string;
  description: string;
  icon: React.ReactNode;
  minTeams: number;
  gradient: string;
}

export const formatOptions: FormatOption[] = [
  {
    type: "round_robin",
    label: "Round Robin",
    description: "Every team plays against every other team once. Best for leagues.",
    icon: <ArrowPathIcon className="w-7 h-7" />,
    minTeams: 3,
    gradient: "from-emerald-500 to-green-600",
  },
  {
    type: "single_elimination",
    label: "Single Elimination",
    description: "Lose once and you're out. Fast and exciting tournament format.",
    icon: <BracketIcon className="w-7 h-7" />,
    minTeams: 2,
    gradient: "from-violet-500 to-purple-600",
  },
  {
    type: "double_elimination",
    label: "Double Elimination",
    description: "Must lose twice to be eliminated. More forgiving tournament format.",
    icon: <Square3Stack3DIcon className="w-7 h-7" />,
    minTeams: 4,
    gradient: "from-blue-500 to-indigo-600",
  },
  {
    type: "win2out",
    label: "Win 2 & Out",
    description: "True endless! Winner stays, win 2 = champion & back to queue. Track who gets crowned most!",
    icon: <CrownIcon className="w-7 h-7" />,
    minTeams: 3,
    gradient: "from-primary to-red-400",
  },
  {
    type: "two_match_rotation",
    label: "2 Match Rotation",
    description: "Play 2 matches then rotate. First match winner stays, then everyone gets 2 games before rotating.",
    icon: <RotationIcon className="w-7 h-7" />,
    minTeams: 3,
    gradient: "from-rose-500 to-pink-600",
  },
];

export const useNewCompetitionPage = () => {
  const router = useRouter();
  const { state, addTeam, createCompetition } = useApp();
  const [step, setStep] = useState<Step>("format");
  const [selectedFormat, setSelectedFormat] = useState<CompetitionType | null>(null);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [competitionName, setCompetitionName] = useState("");
  const [nameError, setNameError] = useState("");
  const [numberOfCourts, setNumberOfCourts] = useState(1);
  const [matchSeriesLength, setMatchSeriesLength] = useState(1);
  const [instantWinEnabled, setInstantWinEnabled] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  // Competition config state
  const [pointsForWin, setPointsForWin] = useState(DEFAULT_COMPETITION_CONFIG.pointsForWin);
  const [pointsForTie, setPointsForTie] = useState(0);
  const [pointsForLoss, setPointsForLoss] = useState(DEFAULT_COMPETITION_CONFIG.pointsForLoss);
  const [allowTies, setAllowTies] = useState(DEFAULT_COMPETITION_CONFIG.allowTies);
  const [venueName, setVenueName] = useState(DEFAULT_COMPETITION_CONFIG.terminology.venue);

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

  const handleFormatSelect = useCallback((type: CompetitionType) => {
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

  const handleCreateCompetition = useCallback(() => {
    const trimmedName = competitionName.trim();
    if (!trimmedName) {
      setNameError("Competition name is required");
      return;
    }
    if (!selectedFormat) return;

    const courtsToUse =
      selectedFormat === "two_match_rotation" || selectedFormat === "win2out"
        ? numberOfCourts
        : undefined;
    const seriesLengthToUse =
      selectedFormat === "round_robin" ||
      selectedFormat === "single_elimination" ||
      selectedFormat === "double_elimination"
        ? matchSeriesLength
        : undefined;
    const instantWinToUse =
      selectedFormat === "two_match_rotation" || selectedFormat === "win2out"
        ? instantWinEnabled
        : undefined;

    // Build config only if user has customized settings
    const isCustomized =
      pointsForWin !== DEFAULT_COMPETITION_CONFIG.pointsForWin ||
      pointsForLoss !== DEFAULT_COMPETITION_CONFIG.pointsForLoss ||
      allowTies !== DEFAULT_COMPETITION_CONFIG.allowTies ||
      venueName !== DEFAULT_COMPETITION_CONFIG.terminology.venue;

    const config: CompetitionConfig | undefined = isCustomized
      ? {
          pointsForWin,
          pointsForTie: allowTies ? pointsForTie : undefined,
          pointsForLoss,
          allowTies,
          terminology: {
            venue: venueName,
            venuePlural: venueName + "s",
            match: DEFAULT_COMPETITION_CONFIG.terminology.match,
            matchPlural: DEFAULT_COMPETITION_CONFIG.terminology.matchPlural,
          },
        }
      : undefined;

    createCompetition(
      trimmedName,
      selectedFormat,
      selectedTeamIds,
      courtsToUse,
      seriesLengthToUse,
      instantWinToUse,
      config
    );

    router.push("/competitions");
  }, [
    competitionName,
    selectedFormat,
    selectedTeamIds,
    numberOfCourts,
    matchSeriesLength,
    instantWinEnabled,
    pointsForWin,
    pointsForTie,
    pointsForLoss,
    allowTies,
    venueName,
    createCompetition,
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
    // Advanced settings
    showAdvancedSettings,
    setShowAdvancedSettings,
    pointsForWin,
    setPointsForWin,
    pointsForTie,
    setPointsForTie,
    pointsForLoss,
    setPointsForLoss,
    allowTies,
    setAllowTies,
    venueName,
    setVenueName,
  };
};
