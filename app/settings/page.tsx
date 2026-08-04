"use client";

import React from "react";
import { PageContent } from "@/components/shared/page-content";
import { PageHeader } from "@/components/shared/page-header";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsItem } from "@/components/settings/settings-item";
import { ThemeSelector } from "@/components/settings/theme-selector";
import { DangerZone } from "@/components/settings/danger-zone";
import { RoadmapSettings } from "@/components/settings/roadmap-settings";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useSettings } from "@/providers/settings-provider";
import { SettingsSkeleton } from "@/components/settings/settings-skeleton";

const SECTIONS = [
  "General",
  "Appearance",
  "Roadmap",
  "Session",
  "Revision",
  "Danger Zone",
] as const;

export default function SettingsPage() {
  const { settings, ready, updatePreferences } = useSettings();

  // Settings are read from storage on mount. Rendering the controls
  // before that resolves would briefly show defaults and then visibly
  // flip to the user's saved values.
  if (!ready) return <SettingsSkeleton />;

  return (
    <PageContent>
      <PageHeader title="Settings" description="Configure PHOS to suit your preferences." />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="hidden space-y-1 lg:block">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Sections
          </p>
          <nav className="space-y-1">
            {SECTIONS.map((section) => (
              <a
                key={section}
                href={`#${section.toLowerCase().replace(" ", "-")}`}
                className="block rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                {section}
              </a>
            ))}
          </nav>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <SettingsSection
            id="general"
            title="General"
            description="Basic application preferences."
          >
            <SettingsItem
              label="Language"
              description="Interface language. Only English is available in this version."
            >
              <Select value={settings.general.language} disabled>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="English" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </SettingsItem>

            <SettingsItem label="Date Format" description="How dates are displayed.">
              <Select
                value={settings.general.dateFormat}
                onValueChange={(dateFormat) => updatePreferences({ dateFormat })}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="MM/DD/YYYY" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mdy">MM/DD/YYYY</SelectItem>
                  <SelectItem value="dmy">DD/MM/YYYY</SelectItem>
                </SelectContent>
              </Select>
            </SettingsItem>

            <SettingsItem label="Time Format" description="12-hour or 24-hour clock.">
              <Select
                value={settings.general.timeFormat}
                onValueChange={(timeFormat) => updatePreferences({ timeFormat })}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="12-hour" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12h">12-hour</SelectItem>
                  <SelectItem value="24h">24-hour</SelectItem>
                </SelectContent>
              </Select>
            </SettingsItem>
          </SettingsSection>

          <SettingsSection
            id="appearance"
            title="Appearance"
            description="Customize the visual experience."
          >
            <SettingsItem label="Theme" description="Choose your preferred color theme.">
              <ThemeSelector />
            </SettingsItem>

            <SettingsItem
              label="Reduced Motion"
              description="Minimize animations throughout the interface."
            >
              <Switch
                checked={settings.appearance.reducedMotion}
                onCheckedChange={(reducedMotion) => updatePreferences({ reducedMotion })}
                aria-label="Reduced motion"
              />
            </SettingsItem>

            <SettingsItem label="Compact Mode" description="Reduce spacing for denser layouts.">
              <Switch
                checked={settings.appearance.compactMode}
                onCheckedChange={(compactMode) => updatePreferences({ compactMode })}
                aria-label="Compact mode"
              />
            </SettingsItem>
          </SettingsSection>

          <div id="roadmap">
            <RoadmapSettings />
          </div>

          <SettingsSection
            id="session"
            title="Session Preferences"
            description="How sessions behave and display."
          >
            <SettingsItem label="Show Timer" description="Display elapsed time during sessions.">
              <Switch
                checked={settings.session.showTimer}
                onCheckedChange={(showTimer) => updatePreferences({ sessionShowTimer: showTimer })}
                aria-label="Show session timer"
              />
            </SettingsItem>

            <SettingsItem label="Show Progress" description="Display progress bar during sessions.">
              <Switch
                checked={settings.session.showProgress}
                onCheckedChange={(showProgress) =>
                  updatePreferences({ sessionShowProgress: showProgress })
                }
                aria-label="Show session progress"
              />
            </SettingsItem>

            <SettingsItem
              label="Confirm Completion"
              description="Ask for confirmation before marking complete."
            >
              <Switch
                checked={settings.session.confirmCompletion}
                onCheckedChange={(confirmCompletion) =>
                  updatePreferences({ sessionConfirmCompletion: confirmCompletion })
                }
                aria-label="Confirm session completion"
              />
            </SettingsItem>
          </SettingsSection>

          <SettingsSection
            id="revision"
            title="Revision Preferences"
            description="How revision sessions behave."
          >
            <SettingsItem label="Show Progress" description="Display progress during revision.">
              <Switch
                checked={settings.revision.showProgress}
                onCheckedChange={(showProgress) =>
                  updatePreferences({ revisionShowProgress: showProgress })
                }
                aria-label="Show revision progress"
              />
            </SettingsItem>
          </SettingsSection>

          <div id="danger-zone">
            <DangerZone />
          </div>
        </div>
      </div>
    </PageContent>
  );
}
