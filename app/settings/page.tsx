"use client";
import React from "react";
import { PageContent } from "@/components/shared/page-content";
import { PageHeader } from "@/components/shared/page-header";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsItem } from "@/components/settings/settings-item";
import { ThemeSelector } from "@/components/settings/theme-selector";
import { DangerZone } from "@/components/settings/danger-zone";
import { RoadmapSettings } from "@/components/settings/roadmap-settings";
import { GoalSettings } from "@/components/settings/goal-settings";
import { RevisionModeSettings } from "@/components/settings/revision-mode-settings";
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
  ["general", "General"],
  ["appearance", "Appearance"],
  ["roadmap", "Roadmap"],
  ["goal", "Goal"],
  ["revision-mode", "Revision"],
  ["session", "Study controls"],
  ["danger-zone", "Reset & recovery"],
] as const;
function Choice({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly (readonly [string, string])[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label} className="w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map(([key, text]) => (
          <SelectItem key={key} value={key}>
            {text}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
export default function SettingsPage() {
  const { settings, ready, updatePreferences, error } = useSettings();
  const [section, setSection] = React.useState<string>("general");
  React.useEffect(() => {
    const sync = () => {
      const hash = window.location.hash.slice(1);
      if (SECTIONS.some(([id]) => id === hash)) setSection(hash);
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  const select = (id: string) => {
    setSection(id);
    window.history.replaceState(null, "", `#${id}`);
  };
  if (!ready) return <SettingsSkeleton />;
  return (
    <PageContent>
      <PageHeader
        title="Make PHOS yours"
        description="Your study, your order, your preferred way of working."
      />
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      <div className="grid gap-8 lg:grid-cols-[180px_minmax(0,1fr)]">
        <nav
          aria-label="Settings sections"
          className="flex flex-wrap gap-x-3 gap-y-1 border-b pb-3 lg:flex-col lg:border-r lg:border-b-0 lg:pr-5"
        >
          {SECTIONS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-current={section === id ? "page" : undefined}
              className={`min-h-11 rounded-md px-3 text-left text-sm transition-colors ${section === id ? "bg-accent text-primary font-medium" : "text-muted-foreground hover:bg-muted"}`}
              onClick={() => select(id)}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="tab-panel min-w-0" key={section}>
          {section === "general" && (
            <SettingsSection
              id="general"
              title="General"
              description="English interface. Dates and times in the format you prefer."
            >
              <SettingsItem label="Language" description="English is available in this version.">
                <span className="text-sm">English</span>
              </SettingsItem>
              <SettingsItem label="Date format" description="Used throughout your record.">
                <Choice
                  label="Date format"
                  value={settings.general.dateFormat}
                  onChange={(dateFormat) => updatePreferences({ dateFormat })}
                  options={[
                    ["mdy", "MM/DD/YYYY"],
                    ["dmy", "DD/MM/YYYY"],
                  ]}
                />
              </SettingsItem>
              <SettingsItem label="Time format">
                <Choice
                  label="Time format"
                  value={settings.general.timeFormat}
                  onChange={(timeFormat) => updatePreferences({ timeFormat })}
                  options={[
                    ["12h", "12-hour"],
                    ["24h", "24-hour"],
                  ]}
                />
              </SettingsItem>
            </SettingsSection>
          )}
          {section === "appearance" && (
            <SettingsSection
              id="appearance"
              title="Appearance"
              description="Two considered themes, with the option to follow your device."
            >
              <SettingsItem label="Theme">
                <ThemeSelector />
              </SettingsItem>
              <SettingsItem
                label="Reduced motion"
                description="Keep transitions quiet and the reminder still."
              >
                <Switch
                  checked={settings.appearance.reducedMotion}
                  onCheckedChange={(reducedMotion) => updatePreferences({ reducedMotion })}
                  aria-label="Reduced motion"
                />
              </SettingsItem>
              <SettingsItem label="Compact mode" description="A closer spacing rhythm.">
                <Switch
                  checked={settings.appearance.compactMode}
                  onCheckedChange={(compactMode) => updatePreferences({ compactMode })}
                  aria-label="Compact mode"
                />
              </SettingsItem>
            </SettingsSection>
          )}
          {section === "roadmap" && <RoadmapSettings />}
          {section === "goal" && <GoalSettings />}
          {section === "revision-mode" && <RevisionModeSettings />}
          {section === "session" && (
            <div className="space-y-8">
              <SettingsSection
                id="session"
                title="Study controls"
                description="Choose what is visible while you study."
              >
                <SettingsItem
                  label="Show timer"
                  description="Elapsed session time includes pauses."
                >
                  <Switch
                    checked={settings.session.showTimer}
                    onCheckedChange={(sessionShowTimer) => updatePreferences({ sessionShowTimer })}
                    aria-label="Show session timer"
                  />
                </SettingsItem>
                <SettingsItem label="Show Sabaq progress">
                  <Switch
                    checked={settings.session.showProgress}
                    onCheckedChange={(sessionShowProgress) =>
                      updatePreferences({ sessionShowProgress })
                    }
                    aria-label="Show session progress"
                  />
                </SettingsItem>
                <SettingsItem
                  label="Confirm Sabaq completion"
                  description="Review the final action before recording new pages."
                >
                  <Switch
                    checked={settings.session.confirmCompletion}
                    onCheckedChange={(sessionConfirmCompletion) =>
                      updatePreferences({ sessionConfirmCompletion })
                    }
                    aria-label="Confirm session completion"
                  />
                </SettingsItem>
                <SettingsItem label="Show revision progress">
                  <Switch
                    checked={settings.revision.showProgress}
                    onCheckedChange={(revisionShowProgress) =>
                      updatePreferences({ revisionShowProgress })
                    }
                    aria-label="Show revision progress"
                  />
                </SettingsItem>
              </SettingsSection>
            </div>
          )}
          {section === "danger-zone" && <DangerZone />}
          <p className="text-muted-foreground mt-8 text-sm">
            Preferences save as you change them. Roadmap and goal changes keep your learned pages
            and study history.
          </p>
        </div>
      </div>
    </PageContent>
  );
}
