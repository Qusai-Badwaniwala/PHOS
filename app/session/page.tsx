import { Suspense } from "react";
import { StudyExperience } from "@/components/shared/study-experience";
export default function SessionPage() {
  return (
    <Suspense fallback={<p role="status">Opening your study…</p>}>
      <StudyExperience />
    </Suspense>
  );
}
