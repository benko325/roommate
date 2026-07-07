import { Check, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { m } from "@/paraglide/messages";
import { getLocale, locales, setLocale } from "@/paraglide/runtime";

// Language names are shown in their own language on purpose (endonyms).
const LABELS: Record<string, string> = { en: "English", cs: "Čeština", sk: "Slovenčina" };

/** Locale picker; setLocale persists the choice and reloads with the new language. */
export function LanguageSwitcher() {
  const current = getLocale();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={m.language_switcher_aria()}>
          <Languages className="size-4" /> {current.toUpperCase()}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((locale) => (
          <DropdownMenuItem key={locale} onClick={() => setLocale(locale)}>
            {LABELS[locale] ?? locale}
            {locale === current && <Check className="ml-auto size-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
