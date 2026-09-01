"use client";

import * as React from "react";
import { Palette, Moon, Sun, Check } from "lucide-react";

export type AccentColor = "blue" | "violet" | "emerald" | "amber" | "rose" | "cyan";

export const ACCENT_PALETTES: Array<{
  id: AccentColor;
  label: string;
  dotColor: string;
  gradient: string;
}> = [
  {
    id: "blue",
    label: "Sapphire Blue",
    dotColor: "bg-blue-500",
    gradient: "from-blue-600 to-indigo-600",
  },
  {
    id: "violet",
    label: "Royal Violet",
    dotColor: "bg-purple-500",
    gradient: "from-purple-600 to-indigo-600",
  },
  {
    id: "emerald",
    label: "Emerald Mint",
    dotColor: "bg-emerald-500",
    gradient: "from-emerald-600 to-teal-600",
  },
  {
    id: "amber",
    label: "Sunset Amber",
    dotColor: "bg-amber-500",
    gradient: "from-amber-500 to-orange-600",
  },
  {
    id: "rose",
    label: "Neon Rose",
    dotColor: "bg-rose-500",
    gradient: "from-rose-500 to-pink-600",
  },
  {
    id: "cyan",
    label: "Cyber Cyan",
    dotColor: "bg-cyan-400",
    gradient: "from-cyan-500 to-blue-600",
  },
];

export function ThemeSelector() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [themeMode, setThemeMode] = React.useState<"light" | "dark">("light");
  const [accent, setAccent] = React.useState<AccentColor>("blue");
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const savedMode = (localStorage.getItem("stockflow_theme_mode") as "light" | "dark") || "light";
    const savedAccent = (localStorage.getItem("stockflow_accent") as AccentColor) || "blue";
    
    setThemeMode(savedMode);
    setAccent(savedAccent);

    if (savedMode === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    }

    document.documentElement.setAttribute("data-accent", savedAccent);
  }, []);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggleMode = (mode: "light" | "dark") => {
    setThemeMode(mode);
    localStorage.setItem("stockflow_theme_mode", mode);
    if (mode === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    }
  };

  const handleSelectAccent = (color: AccentColor) => {
    setAccent(color);
    localStorage.setItem("stockflow_accent", color);
    document.documentElement.setAttribute("data-accent", color);
  };

  const currentPalette = ACCENT_PALETTES.find((p) => p.id === accent) || ACCENT_PALETTES[0];

  return (
    <div className="flex items-center gap-1.5" ref={dropdownRef}>
      {/* Direct Light / Dark Toggle Button */}
      <button
        type="button"
        onClick={() => handleToggleMode(themeMode === "light" ? "dark" : "light")}
        className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-800 shadow-sm"
        title={themeMode === "light" ? "Switch to Dark Mode" : "Switch to Light (White) Mode"}
      >
        {themeMode === "light" ? (
          <Sun className="h-4 w-4 text-amber-500 animate-in spin-in-180" />
        ) : (
          <Moon className="h-4 w-4 text-blue-400 animate-in spin-in-180" />
        )}
      </button>

      {/* Palette Dropdown Toggle */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-800 shadow-sm"
          title="Change Accent Color"
        >
          <Palette className="h-4 w-4 text-indigo-500" />
          <span className={`h-2.5 w-2.5 rounded-full ${currentPalette.dotColor} ring-1 ring-slate-400/40`} />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-60 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-3.5 z-50 animate-in fade-in zoom-in-95 space-y-3 text-xs">
            {/* Mode Switcher */}
            <div>
              <span className="font-black uppercase text-[10px] tracking-wider text-slate-400 block mb-1.5">
                Display Theme
              </span>
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => handleToggleMode("light")}
                  className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg font-bold text-xs transition-all ${
                    themeMode === "light"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  <span>White</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleMode("dark")}
                  className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg font-bold text-xs transition-all ${
                    themeMode === "dark"
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Moon className="w-3.5 h-3.5 text-blue-400" />
                  <span>Dark</span>
                </button>
              </div>
            </div>

            {/* Accent Palette */}
            <div>
              <span className="font-black uppercase text-[10px] tracking-wider text-slate-400 block mb-1.5">
                Brand Accent Color
              </span>
              <div className="space-y-1">
                {ACCENT_PALETTES.map((palette) => {
                  const isSelected = accent === palette.id;
                  return (
                    <button
                      key={palette.id}
                      type="button"
                      onClick={() => {
                        handleSelectAccent(palette.id);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                        isSelected
                          ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`h-3 w-3 rounded-full ${palette.dotColor} shadow-sm`} />
                        <span>{palette.label}</span>
                      </div>

                      {isSelected && <Check className="w-3.5 h-3.5 text-indigo-500" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
