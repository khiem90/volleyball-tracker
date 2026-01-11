"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Home } from "lucide-react";

interface SessionErrorStateProps {
  error: string | null;
  shareCode: string;
}

export const SessionErrorState = ({
  error,
  shareCode,
}: SessionErrorStateProps) => {
  const isEnded = error?.includes("ended");

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div
            className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center ${
              isEnded ? "bg-amber-500/10" : "bg-destructive/10"
            }`}
          >
            <AlertCircle
              className={`w-8 h-8 ${
                isEnded ? "text-amber-500" : "text-destructive"
              }`}
            />
          </div>
          <CardTitle>{isEnded ? "Session Ended" : "Session Not Found"}</CardTitle>
          <CardDescription>
            {error ||
              `We couldn't find a session with code "${shareCode}". It may have been deleted or the code is incorrect.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Link href="/">
            <Button className="w-full gap-2 cursor-pointer">
              <Home className="w-4 h-4" />
              Go to Dashboard
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
};
