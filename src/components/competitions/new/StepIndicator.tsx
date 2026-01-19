import { CheckIcon } from "@heroicons/react/24/outline";
import type { Step } from "@/hooks/useNewCompetitionPage";

interface StepIndicatorProps {
  step: Step;
}

export const StepIndicator = ({ step }: StepIndicatorProps) => {
  const steps = ["format", "teams", "name"] as const;
  const labels = ["Format", "Teams", "Name"];

  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((currentStep, index) => {
        const isActive = currentStep === step;
        const isPast =
          (currentStep === "format" && (step === "teams" || step === "name")) ||
          (currentStep === "teams" && step === "name");

        return (
          <div key={currentStep} className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold
                  transition-all duration-300
                  ${isActive ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30" : ""}
                  ${isPast ? "bg-emerald-500 text-white" : ""}
                  ${!isActive && !isPast ? "bg-card border border-border/50 text-muted-foreground" : ""}
                `}
              >
                {isPast ? <CheckIcon className="w-5 h-5" /> : index + 1}
              </div>
              <span
                className={`text-xs font-medium ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {labels[index]}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`w-12 h-0.5 mb-5 ${
                  isPast ? "bg-emerald-500" : "bg-border"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};
