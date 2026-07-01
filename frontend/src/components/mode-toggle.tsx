import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

const ORDER = ["light", "dark", "system"] as const;
const ICON = { light: Sun, dark: Moon, system: Monitor };

/** Cycles light → dark → system. Icon-only, so it carries an aria-label. */
export function ModeToggle() {
  const { theme = "system", setTheme } = useTheme();
  const current = (ORDER as readonly string[]).includes(theme)
    ? (theme as (typeof ORDER)[number])
    : "system";
  const Icon = ICON[current];

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={`Theme: ${current}. Switch theme.`}
      onClick={() => setTheme(ORDER[(ORDER.indexOf(current) + 1) % ORDER.length])}
    >
      <Icon className="size-5" />
    </Button>
  );
}
