import Image from "next/image";
import Link from "next/link";
import { PageContent } from "@/components/shared/page-content";
import { PageHeader } from "@/components/shared/page-header";
import { ExpectationsPanel } from "@/components/onboarding/expectations-panel";
import { AuthorCredit } from "@/components/about/author-credit";
import { GuideFaq } from "@/components/about/guide-faq";
import { InstallGuide } from "@/components/shared/install-guide";
import { GUIDE_SECTIONS, VISION_QUOTE } from "@/components/about/guide-content";
import { withBasePath, APPLICATION_VERSION } from "@/shared/constants";
export const metadata = { title: "About & guide" };
export default function AboutPage() {
  return (
    <PageContent>
      <PageHeader
        title="A companion to your Hifz"
        description="The PHOS guide, available whenever you need it."
      />
      <div className="grid items-center gap-7 border-y py-7 sm:grid-cols-[112px_1fr]">
        <Image
          src={withBasePath("/icons/icon-192.png")}
          width={112}
          height={112}
          alt="PHOS — an open book within an arch"
          className="rounded-xl"
        />
        <div>
          <p className="font-serif text-xl">{VISION_QUOTE}</p>
          <p className="text-muted-foreground mt-3 text-sm">
            Personal Hifz Operating System · {APPLICATION_VERSION}
          </p>
          <AuthorCredit className="mt-2" />
        </div>
      </div>
      <section>
        <h2 className="font-serif text-2xl">Start with the daily rhythm</h2>
        <div className="mt-5 grid gap-6 sm:grid-cols-3">
          {[
            ["Sabaq", "Learn the next pages in your chosen order."],
            ["Sabaqi", "Return to recent memorization while it is still taking root."],
            ["Manzil", "Keep established pages within reach through revision."],
          ].map(([title, copy]) => (
            <div key={title}>
              <h3 className="font-medium">{title}</h3>
              <p className="text-muted-foreground mt-2 text-sm">{copy}</p>
            </div>
          ))}
        </div>
        <p className="text-muted-foreground mt-5 text-sm">
          PHOS works with your own 604-page Madinah / Misri Mushaf. It plans study and records
          recall; use your Mushaf and teacher for recitation.
        </p>
        <Link
          href="/dashboard"
          className="text-primary mt-4 inline-flex min-h-11 items-center text-sm"
        >
          Open today’s assignments →
        </Link>
      </section>
      <section className="folio-section">
        <h2 className="mb-4 font-serif text-2xl">Understand PHOS</h2>
        <div className="divide-y border-y">
          {GUIDE_SECTIONS.map((section) => (
            <details key={section.id} id={section.id}>
              <summary className="min-h-16 cursor-pointer py-5 font-medium">
                {section.title}
              </summary>
              <div className="text-muted-foreground pb-6 text-base">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="mb-4 max-w-3xl">
                    {paragraph}
                  </p>
                ))}
                {section.insight && (
                  <blockquote className="border-primary text-foreground mt-5 max-w-3xl border-l-2 pl-5">
                    {section.insight}
                  </blockquote>
                )}
              </div>
            </details>
          ))}
        </div>
      </section>
      <GuideFaq />
      <section className="folio-section" id="expectations">
        <h2 className="mb-6 font-serif text-2xl">What PHOS can help with</h2>
        <ExpectationsPanel />
      </section>
      <section className="folio-section" id="install">
        <h2 className="mb-5 font-serif text-2xl">Keep PHOS close</h2>
        <InstallGuide />
      </section>
      <footer className="text-muted-foreground flex flex-wrap justify-between gap-4 border-t pt-6 text-sm">
        <span>Version {APPLICATION_VERSION}</span>
        <span>Local storage · No accounts · No tracking</span>
        <Link href="/backup" className="text-primary">
          Protect your record →
        </Link>
      </footer>
    </PageContent>
  );
}
