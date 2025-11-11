import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type UserMode = "easy" | "advanced";

const MODE_STORAGE_KEY = "lenxys-user-mode";
const DEFAULT_MODE: UserMode = "easy";

interface ModeContextType {
  mode: UserMode;
  setMode: (mode: UserMode) => void;
  isEasyMode: boolean;
  isAdvancedMode: boolean;
}

const ModeContext = createContext<ModeContextType | undefined>(undefined);

export function ModeProvider({ children }: { children: ReactNode }): JSX.Element {
  const [mode, setModeState] = useState<UserMode>(DEFAULT_MODE);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Load mode from localStorage on mount
    const stored = localStorage.getItem(MODE_STORAGE_KEY);
    if (stored === "easy" || stored === "advanced") {
      setModeState(stored);
    }
    setMounted(true);
  }, []);

  const setMode = (newMode: UserMode) => {
    setModeState(newMode);
    localStorage.setItem(MODE_STORAGE_KEY, newMode);
  };

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ModeContext.Provider
      value={{
        mode,
        setMode,
        isEasyMode: mode === "easy",
        isAdvancedMode: mode === "advanced",
      }}
    >
      {children}
    </ModeContext.Provider>
  );
}

export function useMode(): ModeContextType {
  const context = useContext(ModeContext);
  if (context === undefined) {
    throw new Error("useMode must be used within a ModeProvider");
  }
  return context;
}

