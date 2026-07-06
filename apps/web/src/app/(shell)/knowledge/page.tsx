import type { Metadata } from "next";
import { KnowledgeView } from "@/features/knowledge/KnowledgeView";

export const metadata: Metadata = { title: "Knowledge Hub" };

export default function KnowledgePage() {
  return <KnowledgeView />;
}
