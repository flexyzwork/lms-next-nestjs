import { create } from "zustand";

type ThemeState = {
  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;
  toggleTheme: () => void;
};

export const useThemeStore = create<ThemeState>((set) => ({
  theme:
    typeof window !== "undefined" && localStorage.getItem("theme")
      ? (localStorage.getItem("theme") as "light" | "dark")
      : "light",
  setTheme: (theme) => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.classList.toggle("light", theme === "light");
    localStorage.setItem("theme", theme);
    set({ theme });
  },
  toggleTheme: () =>
    set((state) => {
      const newTheme = state.theme === "light" ? "dark" : "light";
      document.documentElement.classList.toggle("dark", newTheme === "dark");
      document.documentElement.classList.toggle("light", newTheme === "light");
      localStorage.setItem("theme", newTheme);
      return { theme: newTheme };
    }),
}));