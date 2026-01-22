"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { LogIn, Eye } from "lucide-react";
import { useSessionAuth } from "./useSessionAuth";
import { GoogleSignInButton } from "./GoogleSignInButton";
import { EmailAuthForm } from "./EmailAuthForm";
import { AdminTokenForm } from "./AdminTokenForm";

interface SessionAuthProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  showViewerOption?: boolean;
}

export const SessionAuth = ({
  open,
  onOpenChange,
  onSuccess,
  showViewerOption = true,
}: SessionAuthProps) => {
  const {
    activeTab,
    setActiveTab,
    email,
    setEmail,
    password,
    setPassword,
    adminToken,
    setAdminToken,
    error,
    isLoading,
    isConfigured,
    handleGoogleSignIn,
    handleEmailSignIn,
    handleEmailSignUp,
    handleAdminToken,
    handleContinueAsViewer,
  } = useSessionAuth({
    onClose: () => onOpenChange(false),
    onSuccess,
  });

  if (!isConfigured) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Firebase Not Configured</DialogTitle>
            <DialogDescription>
              Firebase is not configured. Please add your Firebase configuration to enable authentication.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogIn className="w-5 h-5 text-primary" />
            Sign In
          </DialogTitle>
          <DialogDescription>
            Sign in to get admin access to this session
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as typeof activeTab)}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
            <TabsTrigger value="admin">Admin Token</TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="space-y-4 mt-4">
            <GoogleSignInButton onClick={handleGoogleSignIn} disabled={isLoading} />

            <div className="relative">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs text-muted-foreground">
                or
              </span>
            </div>

            <EmailAuthForm
              email={email}
              password={password}
              onEmailChange={setEmail}
              onPasswordChange={setPassword}
              onSubmit={handleEmailSignIn}
              isLoading={isLoading}
              mode="signin"
            />
          </TabsContent>

          <TabsContent value="signup" className="space-y-4 mt-4">
            <EmailAuthForm
              email={email}
              password={password}
              onEmailChange={setEmail}
              onPasswordChange={setPassword}
              onSubmit={handleEmailSignUp}
              isLoading={isLoading}
              mode="signup"
            />
          </TabsContent>

          <TabsContent value="admin" className="space-y-4 mt-4">
            <AdminTokenForm
              adminToken={adminToken}
              onAdminTokenChange={setAdminToken}
              onSubmit={handleAdminToken}
              isLoading={isLoading}
            />
          </TabsContent>
        </Tabs>

        {error && (
          <p className="text-sm text-destructive text-center mt-2">{error}</p>
        )}

        {showViewerOption && (
          <>
            <Separator />
            <Button
              variant="ghost"
              className="w-full gap-2 cursor-pointer"
              onClick={handleContinueAsViewer}
            >
              <Eye className="w-4 h-4" />
              Continue as Viewer (Read Only)
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
