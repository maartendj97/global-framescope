"use client";

import { useSyncExternalStore } from "react";
import * as RadioGroup from "@radix-ui/react-radio-group";
import { motion } from "motion/react";
import { getLayoutTransition, useReducedMotion } from "@/lib/motionConfig";
import { applyTheme, getStoredPreference, type ThemePreference } from "@/lib/theme";

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getServerSnapshot(): ThemePreference {
  return "light";
}

export default function SettingsPage() {
  const preference = useSyncExternalStore(subscribe, getStoredPreference, getServerSnapshot);
  const prefersReducedMotion = useReducedMotion();

  function handleSelect(value: ThemePreference) {
    applyTheme(value);
    listeners.forEach((listener) => listener());
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 pt-8 pb-4 md:max-w-[960px]">
      <h1 className="font-serif text-2xl text-foreground">Settings</h1>

      <div className="mt-4 rounded-2xl border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold text-foreground">Appearance</h2>
        <RadioGroup.Root
          value={preference}
          onValueChange={(value) => handleSelect(value as ThemePreference)}
          aria-label="Appearance"
          className="mt-3 flex gap-1 rounded-full border border-border bg-surface-secondary p-1"
        >
          {OPTIONS.map((option) => (
            <RadioGroup.Item
              key={option.value}
              value={option.value}
              className={`relative flex min-h-11 flex-1 items-center justify-center rounded-full px-3 text-sm font-medium ${
                preference === option.value ? "text-inverse-foreground" : "text-muted-foreground"
              }`}
            >
              {preference === option.value && (
                <motion.div
                  layoutId="theme-thumb"
                  className="absolute inset-0 rounded-full bg-foreground"
                  transition={getLayoutTransition(prefersReducedMotion)}
                />
              )}
              <span className="relative">{option.label}</span>
            </RadioGroup.Item>
          ))}
        </RadioGroup.Root>
      </div>
    </div>
  );
}
