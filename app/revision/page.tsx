import { Suspense } from "react";
import { StudyExperience } from "@/components/shared/study-experience";
export default function RevisionPage() {
  return (
    <Suspense fallback={<p role="status">Opening your revision…</p>}>
      <StudyExperience revision />
    </Suspense>
  );
}
