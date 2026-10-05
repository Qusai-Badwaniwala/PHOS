import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BookOpen } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="bg-muted flex h-16 w-16 items-center justify-center rounded-full">
        <BookOpen className="text-muted-foreground h-8 w-8" />
      </div>
      <div className="space-y-2">
        <h1 className="folio-title text-3xl">This page is not in PHOS</h1>
        <p className="text-muted-foreground max-w-sm text-sm">
          The page you are looking for does not exist. Return to Today to continue your memorization
          journey.
        </p>
      </div>
      <Button asChild>
        <Link href="/dashboard">Return to Today</Link>
      </Button>
    </div>
  );
}
