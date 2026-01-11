"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Home } from "lucide-react";

export const SessionNotConfigured = () => (
  <div className="min-h-screen bg-background flex items-center justify-center p-4">
    <Card className="max-w-md w-full">
      <CardHeader className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-destructive/10 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-destructive" />
        </div>
        <CardTitle>Firebase Not Configured</CardTitle>
        <CardDescription>
          Session sharing requires Firebase to be configured. Please set up Firebase to use this feature.
        </CardDescription>
      </CardHeader>
      <CardContent>
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
