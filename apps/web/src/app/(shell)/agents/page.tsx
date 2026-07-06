import type { Metadata } from "next";
import { AgentsView } from "@/features/agents/AgentsView";

export const metadata: Metadata = { title: "AI Agents" };

export default function AgentsPage() {
  return <AgentsView />;
}
