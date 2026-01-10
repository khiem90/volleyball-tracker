import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { RefreshCw, Brackets, Layers, Crown, RotateCw } from "lucide-react";
import type { CompetitionType } from "@/types/game";

export type Step = "format" | "teams" | "name";

interface FormatOption {
  type: CompetitionType;
  label: string;
  description: string;
  icon: React.ReactNode;
  minTeams: number;
  requiresPowerOf2?: boolean;
  gradient: string;
}

export const formatOptions: FormatOption[] = [
  {
    type: "round_robin",
    label: "Round Robin",
    description: "Every team plays against every other team once. Best for leagues.",
    icon: <RefreshCw className="w-7 h-7" />,
    minTeams: 3,
    gradient: "from-emerald-500 to-teal-600",
  },
  {
    type: "single_elimination",
    label: "Single Elimination",
    description: "Lose once and you're out. Fast and exciting tournament format.",
    icon: <Brackets className="w-7 h-7" />,
    minTeams: 2,
    requiresPowerOf2: true,
    gradient: "from-violet-500 to-purple-600",
  },
  {
    type: "double_elimination",
    label: "Double Elimination",
    description: "Must lose twice to be eliminated. More forgiving tournament format.",
    icon: <Layers className="w-7 h-7" />,
    minTeams: 4,
    requiresPowerOf2: true,
    gradient: "from-blue-500 to-indigo-600",
  },
  {
    type: "win2out",
    label: "Win 2 & Out",
    description: "True endless! Winner stays, win 2 = champion & back to queue. Track who gets crowned most!",
    icon: <Crown className="w-7 h-7" />,
    minTeams: 3,
    gradient: "from-amber-500 to-orange-600",
  },
  {
    type: "two_match_rotation",
    label: "2 Match Rotation",
    description: "Play 2 matches then rotate. First match winner stays, then everyone gets 2 games before rotating.",
    icon: <RotateCw className="w-7 h-7" />,
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

    if (currentFormat.requiresPowerOf2 && !isPowerOf2(count)) {
      const next = nextPowerOf2(count);
      return {
        valid: false,
        message: `Select ${next} teams for a balanced bracket (power of 2)`,
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
    createCompetition(trimmedName, selectedFormat, selectedTeamIds, courtsToUse);

    router.push("/competitions");
  }, [competitionName, selectedFormat, selectedTeamIds, numberOfCourts, createCompetition, router]);

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
    setCompetitionName,
    setNameError,
    setNumberOfCourts,
    setSelectedTeamIds,
    setStep,
    step,
    teamValidation,
    teams: state.teams,
    teamsCount: state.teams.length,
  };
};
