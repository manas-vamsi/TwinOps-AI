import { Suspense } from "react";
import type { Metadata } from "next";
import { KnowledgeView } from "@/features/knowledge/KnowledgeView";

export const metadata: Metadata = { title: "Knowledge Hub" };

export default function KnowledgePage() {
  // Suspense boundary: KnowledgeView reads useSearchParams (?doc=)
  return (
    <Suspense fallback={null}>
      <KnowledgeView />
    </Suspense>
  );
}
