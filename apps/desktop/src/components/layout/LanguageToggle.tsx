import { useEffect, useRef, useState, type ComponentType } from "react";
import { ChevronDown } from "lucide-react";
import { useI18n, type SupportedLanguage } from "../../i18n";
import { FlagBR, FlagES, FlagUS } from "../ui/Flags";

interface LanguageOption {
  code: SupportedLanguage;
  shortLabel: string;
  fullLabel: string;
  Flag: ComponentType<{ width?: number; height?: number }>;
}

const LANGUAGES: LanguageOption[] = [
  { code: "pt-BR", shortLabel: "PT-BR", fullLabel: "Português", Flag: FlagBR },
  { code: "en-US", shortLabel: "EN-US", fullLabel: "English", Flag: FlagUS },
  { code: "es-ES", shortLabel: "ES-ES", fullLabel: "Español", Flag: FlagES },
];

export function LanguageToggle() {
  const { language, setLanguage } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const current = LANGUAGES.find((l) => l.code === language) ?? LANGUAGES[0];
  const CurrentFlag = current.Flag;

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        title="Alterar idioma / Switch language / Cambiar idioma"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="btn"
        style={{
          height: 28,
          padding: "0 9px",
          gap: 6,
          background: isOpen ? "#172030" : "#111723",
          borderColor: isOpen ? "rgba(34, 211, 238, 0.45)" : "var(--border)",
        }}
      >
        <CurrentFlag width={17} height={11} />
        <span className="mono" style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.03em" }}>
          {current.shortLabel}
        </span>
        <ChevronDown
          size={12}
          color={isOpen ? "#22d3ee" : "#65738e"}
          style={{
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 140ms ease",
          }}
        />
      </button>

      {isOpen && (
        <div
          role="menu"
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 6px)",
            zIndex: 80,
            width: 192,
            borderRadius: 10,
            border: "1px solid var(--border-strong)",
            background: "#131924",
            padding: 4,
            boxShadow: "0 16px 40px rgba(0, 0, 0, 0.65)",
          }}
        >
          {LANGUAGES.map((lang) => {
            const isSelected = lang.code === language;
            const LangFlag = lang.Flag;
            return (
              <button
                key={lang.code}
                type="button"
                role="menuitem"
                onClick={() => {
                  setLanguage(lang.code);
                  setIsOpen(false);
                }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "7px 10px",
                  borderRadius: 7,
                  border: "none",
                  background: isSelected ? "rgba(16, 185, 129, 0.14)" : "transparent",
                  color: isSelected ? "#34d399" : "var(--text-primary)",
                  fontWeight: isSelected ? 600 : 500,
                  fontSize: 12.5,
                  textAlign: "left",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <LangFlag width={18} height={12} />
                  <span>{lang.fullLabel}</span>
                </span>
                <span
                  className="mono"
                  style={{
                    fontSize: 10.5,
                    color: isSelected ? "#34d399" : "var(--text-muted)",
                  }}
                >
                  {lang.shortLabel}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
