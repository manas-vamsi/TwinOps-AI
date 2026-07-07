import { Sidebar } from "@/components/shell/Sidebar";
import { TopBar } from "@/components/shell/TopBar";
import { CommandPalette } from "@/components/shell/CommandPalette";
import { RealtimeProvider } from "@/components/shell/RealtimeProvider";
import { NotificationsWatcher } from "@/components/shell/NotificationsWatcher";
import { Copilot } from "@/features/copilot/Copilot";
import { AuthGate } from "@/components/shell/AuthGate";

export default function ShellLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
      <CommandPalette />
      <RealtimeProvider />
      <NotificationsWatcher />
      <Copilot />
      <AuthGate />
    </div>
  );
}
