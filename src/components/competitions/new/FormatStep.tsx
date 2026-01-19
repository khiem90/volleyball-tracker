"use client";

import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CompetitionType } from "@/types/game";
import type { FormatOption } from "@/hooks/useNewCompetitionPage";

interface FormatStepProps {
  formatOptions: FormatOption[];
  selectedFormat: CompetitionType | null;
  onSelectFormat: (type: CompetitionType) => void;
  onNext: () => void;
}

export const FormatStep = ({
  formatOptions,
  selectedFormat,
  onSelectFormat,
  onNext,
}: FormatStepProps) => (
  <div className="space-y-6">
    <div className="text-center mb-8">
      <h2 className="text-2xl font-bold mb-2">Choose Format</h2>
      <p className="text-muted-foreground">
        Select how teams will compete against each other
      </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {formatOptions.map((option) => {
        const isSelected = selectedFormat === option.type;

        return (
          <Card
            key={option.type}
            className={`
              cursor-pointer transition-all duration-300 overflow-hidden
              ${
                isSelected
                  ? "ring-2 ring-primary shadow-lg shadow-primary/20"
                  : "border-border/40 bg-card/50 hover:bg-card hover:border-primary/30"
              }
            `}
            onClick={() => onSelectFormat(option.type)}
            role="button"
            tabIndex={0}
            aria-pressed={isSelected}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelectFormat(option.type);
              }
            }}
          >
            {isSelected && (
              <div className={`h-1 w-full bg-linear-to-r ${option.gradient}`} />
            )}
            <CardHeader className="text-center pb-2">
              <div
                className={`
                  w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4
                  transition-all duration-300 shadow-lg
                  ${
                    isSelected
                      ? `bg-linear-to-br ${option.gradient} text-white`
                      : `bg-linear-to-br ${option.gradient} opacity-60 text-white`
                  }
                `}
              >
                {option.icon}
              </div>
              <CardTitle className="text-lg">{option.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center text-sm">
                {option.description}
              </CardDescription>
              <div className="flex justify-center mt-3">
                <Badge variant="secondary" className="text-xs">
                  Min {option.minTeams} teams
                </Badge>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>

    <div className="flex justify-end pt-4">
      <Button
        onClick={onNext}
        disabled={!selectedFormat}
        className="gap-2 shadow-lg shadow-primary/20"
        size="lg"
      >
        Next
        <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  </div>
);
