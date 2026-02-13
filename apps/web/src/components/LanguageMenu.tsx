import { Languages } from "lucide-react";
import { LOCALE_LABELS, type Locale, SUPPORTED_LOCALES } from "@/i18n/locales";
import { useI18n } from "@/context/I18nContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface LanguageMenuProps {
  className?: string;
  align?: "start" | "center" | "end";
  showShortLabel?: boolean;
}

const LanguageMenu = ({ className, align = "end", showShortLabel = true }: LanguageMenuProps) => {
  const { locale, setLocale, t } = useI18n();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn("gap-2", className)}
          aria-label={t("common.language")}
        >
          <Languages className="w-4 h-4" />
          {showShortLabel ? <span className="text-xs font-semibold">{LOCALE_LABELS[locale].short}</span> : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-52">
        <DropdownMenuLabel>{t("common.language")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={locale} onValueChange={(value) => setLocale(value as Locale)}>
          {SUPPORTED_LOCALES.map((supported) => (
            <DropdownMenuRadioItem key={supported} value={supported}>
              {LOCALE_LABELS[supported].label}
              <DropdownMenuShortcut>{LOCALE_LABELS[supported].short}</DropdownMenuShortcut>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageMenu;

