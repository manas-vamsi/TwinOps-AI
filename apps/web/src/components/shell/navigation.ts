import {
  LayoutDashboard,
  Network,
  Flame,
  Bot,
  BookOpen,
  Server,
  BarChart3,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** roadmap phase in which this surface goes live */
  phase: "P1" | "P2" | "P3" | "P4" | "P5";
  description: string;
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    phase: "P4",
    description:
      "Global health score, business impact, predicted failures and live agent activity — the enterprise at a glance.",
  },
  {
    label: "Digital Twin",
    href: "/twin",
    icon: Network,
    phase: "P1",
    description:
      "The living dependency graph of your infrastructure. Watch failures cascade, click any node for deep AI context.",
  },
  {
    label: "Incidents",
    href: "/incidents",
    icon: Flame,
    phase: "P2",
    description:
      "Every incident becomes a collaborative workspace — timeline, evidence, root cause with confidence, and replay.",
  },
  {
    label: "AI Agents",
    href: "/agents",
    icon: Bot,
    phase: "P4",
    description:
      "Six specialized agents working in the open. No hidden reasoning — every step visible in the live event stream.",
  },
  {
    label: "Knowledge Hub",
    href: "/knowledge",
    icon: BookOpen,
    phase: "P3",
    description:
      "Runbooks, architecture docs and past incidents — semantically searched, always answered with citations.",
  },
  {
    label: "Infrastructure",
    href: "/infrastructure",
    icon: Server,
    phase: "P4",
    description:
      "The searchable inventory of every simulated resource — services, databases, queues, clusters and networks.",
  },
  {
    label: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    phase: "P4",
    description:
      "MTTD, MTTR, prediction accuracy, incident frequency and AI cost — operational intelligence over time.",
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    phase: "P5",
    description:
      "Workspace, roles, AI providers and simulation seed — the controls behind the platform.",
  },
];
