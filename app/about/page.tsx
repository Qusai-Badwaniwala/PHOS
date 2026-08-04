import Image from "next/image";
import { PageContent } from "@/components/shared/page-content";
import { PageHeader } from "@/components/shared/page-header";
import { ContentCard } from "@/components/shared/content-card";
import { FeatureCard } from "@/components/shared/feature-card";
import { Separator } from "@/components/ui/separator";
import { ExpectationsPanel } from "@/components/onboarding/expectations-panel";
import { AuthorCredit } from "@/components/about/author-credit";
import { GuideFaq } from "@/components/about/guide-faq";
import { InstallGuide } from "@/components/shared/install-guide";
import { GUIDE_SECTIONS, VISION_QUOTE } from "@/components/about/guide-content";
import { Heart, Shield, HardDrive, User } from "lucide-react";

export const metadata = {
  title: "About",
};

/**
 * The PHOS guide, in the application.
 *
 * The guide was originally a separate PDF. Keeping it here means it
 * cannot be lost, is available at the moment a question arises, and —
 * most importantly — is held to the same accuracy standard as the rest
 * of the product: a claim in this page has to be true of the build it
 * ships in.
 *
 * PRODUCT_REQUIREMENTS Requirement 6 additionally requires the
 * first-run expectations to remain reachable from About; that section
 * is rendered from the very component the wizard uses, so the two
 * cannot drift apart.
 */
export default function AboutPage() {
  return (
    <PageContent>
      <PageHeader title="About PHOS" description="Personal Hifz Operating System" />

      {/* Masthead */}
      <ContentCard className="text-center">
        <Image
          src="/icons/icon-192.png"
          alt=""
          width={88}
          height={88}
          className="mx-auto mb-5 rounded-2xl"
          priority
        />
        <h2 className="text-xl font-semibold">PHOS</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm italic leading-relaxed text-muted-foreground">
          &ldquo;{VISION_QUOTE}&rdquo;
        </p>
        <AuthorCredit variant="hero" className="mt-8" />
      </ContentCard>

      {/* At a glance */}
      <div className="grid gap-4 sm:grid-cols-2">
        <FeatureCard
          icon={<Shield className="h-5 w-5 text-muted-foreground" />}
          title="Privacy First"
          description="No accounts, no cloud, no tracking, no telemetry."
        />
        <FeatureCard
          icon={<HardDrive className="h-5 w-5 text-muted-foreground" />}
          title="Local First"
          description="Your data is stored on this device and never sent anywhere. Works with no internet."
        />
        <FeatureCard
          icon={<Heart className="h-5 w-5 text-muted-foreground" />}
          title="Built for Focus"
          description="Calm, minimal, and intentionally distraction-free."
        />
        <FeatureCard
          icon={<User className="h-5 w-5 text-muted-foreground" />}
          title="Personal"
          description="Designed for one learner. Adapts to you, not to an average."
        />
      </div>

      {/* The guide */}
      {GUIDE_SECTIONS.map((section) => (
        <ContentCard key={section.id} id={section.id} as="section">
          <h2 className="mb-4 text-lg font-semibold">{section.title}</h2>
          <div className="space-y-3">
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} className="text-sm leading-relaxed text-muted-foreground">
                {paragraph}
              </p>
            ))}
          </div>
          {section.insight && (
            <blockquote className="mt-5 border-l-2 border-gold/50 pl-4">
              <p className="text-xs font-medium uppercase tracking-wider text-gold">PHOS Insight</p>
              <p className="mt-1 text-sm italic leading-relaxed">{section.insight}</p>
            </blockquote>
          )}
        </ContentCard>
      ))}

      {/*
        PRODUCT_REQUIREMENTS Requirement 6: the first-time introduction
        must remain "accessible later from About".
      */}
      <ContentCard as="section" id="expectations">
        <h2 className="mb-1 text-lg font-semibold">What PHOS is — and isn&apos;t</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          The same introduction shown when you first opened PHOS.
        </p>
        <ExpectationsPanel />
      </ContentCard>

      {/*
        Repeated from the first-run wizard, because the moment someone
        decides they want PHOS properly is rarely the moment they first
        opened it. The component reports its own state, so an already
        installed PHOS simply says so rather than nagging.
      */}
      <ContentCard as="section" id="install">
        <h2 className="mb-4 text-lg font-semibold">Using PHOS as an app</h2>
        <InstallGuide />
      </ContentCard>

      <GuideFaq />

      <ContentCard className="text-center">
        <p className="text-sm italic text-muted-foreground">
          &ldquo;The journey of a thousand pages is completed one ayah at a time.&rdquo;
        </p>
        <Separator className="my-5" />
        <AuthorCredit />
        <p className="mt-4 text-xs text-muted-foreground">Version 0.1.0 · Local-first · Private</p>
      </ContentCard>
    </PageContent>
  );
}
