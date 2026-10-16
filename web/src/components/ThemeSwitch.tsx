import { Moon, Sun } from "lucide-react";
import { usePreferences } from "../stores/preferences";
import { IconButton } from "./IconButton";

/** One button showing the current theme. Until it's clicked the theme follows Windows. */
export function ThemeSwitch() {
  const theme = usePreferences((s) => s.theme);
  const setTheme = usePreferences((s) => s.setTheme);
  const next = theme === "dark" ? "light" : "dark";
  const Icon = theme === "dark" ? Moon : Sun;

  return (
    <IconButton label={`Switch to ${next} theme`} onClick={() => setTheme(next)}>
      <Icon className="size-4" aria-hidden />
    </IconButton>
  );
}
