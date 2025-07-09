import React, { createContext, useContext, useEffect, useState } from "react";
import { loadSettings, saveSettings } from "./settings-storage";

export type Settings = {
  isDark: boolean;
  setIsDark: (v: boolean) => void;
  subreddits: string[];
  setSubreddits: (v: string[]) => void;
  duration: string;
  setDuration: (v: string) => void;
  filterByResolution: boolean;
  setFilterByResolution: (v: boolean) => void;
  resizeToDevice: boolean;
  setResizeToDevice: (v: boolean) => void;
  sortOrder: string;
  setSortOrder: (v: string) => void;
  sfwOnly: boolean;
  setSfwOnly: (v: boolean) => void;
  autoRefresh: boolean;
  setAutoRefresh: (v: boolean) => void;
  showDetails: boolean;
  setShowDetails: (v: boolean) => void;
  gridView: boolean;
  setGridView: (v: boolean) => void;
};

const SettingsContext = createContext<Settings | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);
  const [subreddits, setSubreddits] = useState(["wallpapers"]);
  const [duration, setDuration] = useState("week");
  const [filterByResolution, setFilterByResolution] = useState(false);
  const [resizeToDevice, setResizeToDevice] = useState(false);
  // New settings
  const [sortOrder, setSortOrder] = useState("top");
  const [sfwOnly, setSfwOnly] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showDetails, setShowDetails] = useState(true);
  const [gridView, setGridView] = useState(true);

  // Load settings on mount
  useEffect(() => {
    (async () => {
      const loaded = await loadSettings();
      if (typeof loaded.isDark === "boolean") setIsDark(loaded.isDark);
      if (Array.isArray(loaded.subreddits)) setSubreddits(loaded.subreddits);
      if (typeof loaded.duration === "string") setDuration(loaded.duration);
      if (typeof loaded.filterByResolution === "boolean")
        setFilterByResolution(loaded.filterByResolution);
      if (typeof loaded.resizeToDevice === "boolean")
        setResizeToDevice(loaded.resizeToDevice);
      if (typeof loaded.sortOrder === "string") setSortOrder(loaded.sortOrder);
      if (typeof loaded.sfwOnly === "boolean") setSfwOnly(loaded.sfwOnly);
      if (typeof loaded.autoRefresh === "boolean")
        setAutoRefresh(loaded.autoRefresh);
      if (typeof loaded.showDetails === "boolean")
        setShowDetails(loaded.showDetails);
      if (typeof loaded.gridView === "boolean") setGridView(loaded.gridView);
    })();
    // eslint-disable-next-line
  }, []);

  // Save settings when any change
  useEffect(() => {
    saveSettings({
      isDark,
      subreddits,
      duration,
      filterByResolution,
      resizeToDevice,
      sortOrder,
      sfwOnly,
      autoRefresh,
      showDetails,
      gridView,
    });
  }, [
    isDark,
    subreddits,
    duration,
    filterByResolution,
    resizeToDevice,
    sortOrder,
    sfwOnly,
    autoRefresh,
    showDetails,
    gridView,
  ]);

  return (
    <SettingsContext.Provider
      value={{
        isDark,
        setIsDark,
        subreddits,
        setSubreddits,
        duration,
        setDuration,
        filterByResolution,
        setFilterByResolution,
        resizeToDevice,
        setResizeToDevice,
        sortOrder,
        setSortOrder,
        sfwOnly,
        setSfwOnly,
        autoRefresh,
        setAutoRefresh,
        showDetails,
        setShowDetails,
        gridView,
        setGridView,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
