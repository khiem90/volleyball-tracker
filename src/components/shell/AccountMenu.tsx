"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { UnsyncedChangesError } from "@/lib/deviceData";
import { signInHref } from "@/lib/shell";
import { MbIcon } from "@/components/matchbook/MbIcon";
import { ConfirmDialog } from "@/components/console/ConfirmDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Where a sign-out has got: not asked for, under way, refused over changes
 * that have not reached the server, or under way losing them.
 */
type SignOutState = "idle" | "signing_out" | "unsynced" | "discarding";

/**
 * The top bar's account menu: who is signed in and Sign out. A guest gets
 * Sign in instead, coming back to the page it was on.
 */
export const AccountMenu = () => {
  const { user, isLoading, isConfigured, signOut } = useAuth();
  const pathname = usePathname();
  const [signOutState, setSignOutState] = useState<SignOutState>("idle");
  const [error, setError] = useState<string | null>(null);

  if (!isConfigured) return null;

  // Holds the menu's place while auth settles, so the bar does not jump.
  if (isLoading) return <span aria-hidden="true" className="block size-11" />;

  if (!user) {
    return (
      <Link
        href={signInHref(pathname)}
        className="mb-btn mb-btn-outline-navy min-h-11 px-3 text-[0.72rem]"
      >
        Sign in
      </Link>
    );
  }

  // A sign-out that goes through ends in a fresh load of the sign-in page,
  // so only a refusal or a failure comes back here.
  const runSignOut = async (discardUnsynced: boolean) => {
    setSignOutState(discardUnsynced ? "discarding" : "signing_out");
    setError(null);
    try {
      await signOut({ discardUnsynced });
    } catch (failure) {
      if (failure instanceof UnsyncedChangesError) {
        setSignOutState("unsynced");
        return;
      }
      console.error("Sign-out failed:", failure);
      setError("Sign-out failed. Try again.");
      setSignOutState("idle");
    }
  };

  const name = user.displayName || user.email || "Your account";
  const initial = name.charAt(0).toUpperCase();

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger
          aria-label={`Account menu, signed in as ${name}`}
          className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-1 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-mb-coral"
        >
          <Avatar className="size-9 border-[1.5px] border-mb-navy bg-mb-paper-bright">
            {user.photoURL && <AvatarImage src={user.photoURL} alt="" />}
            <AvatarFallback className="matchbook-display bg-mb-paper-bright text-[0.95rem] font-bold text-mb-navy">
              {initial}
            </AvatarFallback>
          </Avatar>
          <MbIcon id="chevron-down" size={12} className="text-mb-ink-muted" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-64 max-w-[calc(100vw-2rem)] rounded-[4px] border-[1.5px] border-mb-navy bg-mb-paper-bright p-1 text-mb-navy"
        >
          <DropdownMenuLabel className="px-3 py-2">
            <span className="mb-kicker block">Signed in as</span>
            {user.displayName && (
              <span className="block truncate text-[0.9rem] font-semibold">{user.displayName}</span>
            )}
            {user.email && (
              <span className="block truncate text-[0.8rem] font-normal text-mb-ink-muted">
                {user.email}
              </span>
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-mb-rule" />
          <DropdownMenuItem
            disabled={signOutState === "signing_out"}
            onSelect={(event) => {
              // The menu stays open to show the sign-out is under way.
              event.preventDefault();
              void runSignOut(false);
            }}
            className="matchbook-display min-h-11 cursor-pointer gap-2 px-3 text-[0.8rem] font-semibold tracking-[0.06em] text-mb-red focus:bg-mb-red/10 focus:text-mb-red"
          >
            <LogOut className="size-4 text-mb-red" />
            {signOutState === "signing_out" ? "Signing out..." : "Sign out"}
          </DropdownMenuItem>
          {error && (
            <p role="alert" className="px-3 pb-2 text-[0.78rem] font-medium text-mb-red">
              {error}
            </p>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={signOutState === "unsynced" || signOutState === "discarding"}
        onOpenChange={(open) => {
          if (!open && signOutState === "unsynced") setSignOutState("idle");
        }}
        icon={LogOut}
        title="Sign out and lose unsaved changes?"
        description="Some changes made on this device have not reached the server yet. Signing out clears them from the device, so they are lost. Stay signed in until you are back online to keep them."
        confirmLabel="Sign out anyway"
        busyLabel="Signing out..."
        isBusy={signOutState === "discarding"}
        onConfirm={() => void runSignOut(true)}
      />
    </>
  );
};
