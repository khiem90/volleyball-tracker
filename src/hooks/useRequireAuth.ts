import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

interface UseRequireAuthOptions {
  redirectTo?: string;
}

/**
 * Hook that redirects unauthenticated users to the login page.
 * Returns user and loading state for use in components.
 *
 * @param options - Configuration options
 * @param options.redirectTo - Custom redirect path (defaults to current path)
 * @returns Object containing user, isLoading, and isGuest states
 */
export const useRequireAuth = (options: UseRequireAuthOptions = {}) => {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, isGuest } = useAuth();

  const redirectTo = options.redirectTo || pathname;

  useEffect(() => {
    // Wait until auth state is determined
    if (isLoading) return;

    // Redirect to login if not authenticated
    if (!user) {
      const loginUrl = `/login?redirect=${encodeURIComponent(redirectTo)}`;
      router.push(loginUrl);
    }
  }, [user, isLoading, router, redirectTo]);

  return {
    user,
    isLoading,
    isGuest,
    isAuthenticated: !!user,
  };
};
