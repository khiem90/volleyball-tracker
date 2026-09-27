import { AppShell } from "@/components/shell/AppShell";

/** Every page in this group gets the tab bar and the top bar; sign-in and scoring sit outside it. */
export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
