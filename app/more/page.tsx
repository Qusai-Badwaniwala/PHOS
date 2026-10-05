"use client";
import Link from "next/link";
import { ArrowRight, Settings, Archive, Info, Download } from "lucide-react";
import { PageContent } from "@/components/shared/page-content";
import { PageHeader } from "@/components/shared/page-header";
import { InstallGuide } from "@/components/shared/install-guide";
export default function MorePage() {
  return (
    <PageContent className="max-w-2xl">
      <PageHeader
        title="Make PHOS yours"
        description="Your rhythm, your preferences, your record."
      />
      <div>
        {[
          {
            href: "/settings",
            title: "Settings",
            detail: "Appearance, study, order and revision",
            icon: Settings,
          },
          {
            href: "/backup",
            title: "Protect your record",
            detail: "Export a file, restore or keep a local copy",
            icon: Archive,
          },
          {
            href: "/about",
            title: "About & guide",
            detail: "How PHOS works, and how to use it",
            icon: Info,
          },
        ].map(({ href, title, detail, icon: Icon }) => (
          <Link href={href} key={href} className="folio-row">
            <Icon size={22} strokeWidth={1.5} className="text-muted-foreground" />
            <div className="flex-1">
              <h2 className="text-lg font-semibold">{title}</h2>
              <p className="text-muted-foreground text-sm">{detail}</p>
            </div>
            <ArrowRight size={18} />
          </Link>
        ))}
      </div>
      <section className="folio-section">
        <div className="mb-4 flex items-center gap-3">
          <Download size={20} />
          <h2 className="text-lg font-semibold">Keep it close</h2>
        </div>
        <InstallGuide />
      </section>
      <p className="text-muted-foreground text-sm">
        PHOS keeps your Hifz on this device. An exported file is the copy you can carry elsewhere.
      </p>
    </PageContent>
  );
}
