import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronDown } from "lucide-react";

/* ─── Flag image helper (flagcdn.com SVGs) ─── */
function FlagImg({ code, size = 20 }: { code: string; size?: number }) {
  return (
    <img
      src={`https://flagcdn.com/w${size}/${code.toLowerCase()}.png`}
      srcSet={`https://flagcdn.com/w${size * 2}/${code.toLowerCase()}.png 2x`}
      width={size}
      height={Math.round(size * 0.75)}
      alt={code}
      className="inline-block rounded-sm object-cover"
      loading="lazy"
    />
  );
}

/* ─── Country list with name and dial code ─── */
const COUNTRIES = [
  { code: "AO", name: "Angola", dial: "+244" },
  { code: "MZ", name: "Moçambique", dial: "+258" },
  { code: "BR", name: "Brasil", dial: "+55" },
  { code: "PT", name: "Portugal", dial: "+351" },
  { code: "CV", name: "Cabo Verde", dial: "+238" },
  { code: "GW", name: "Guiné-Bissau", dial: "+245" },
  { code: "ST", name: "São Tomé e Príncipe", dial: "+239" },
  { code: "TL", name: "Timor-Leste", dial: "+670" },
  { code: "ZA", name: "África do Sul", dial: "+27" },
  { code: "NG", name: "Nigéria", dial: "+234" },
  { code: "CD", name: "RD Congo", dial: "+243" },
  { code: "CG", name: "Congo", dial: "+242" },
  { code: "NA", name: "Namíbia", dial: "+264" },
  { code: "ZM", name: "Zâmbia", dial: "+260" },
  { code: "BW", name: "Botsuana", dial: "+267" },
  { code: "US", name: "EUA", dial: "+1" },
  { code: "GB", name: "Reino Unido", dial: "+44" },
  { code: "FR", name: "França", dial: "+33" },
  { code: "DE", name: "Alemanha", dial: "+49" },
  { code: "ES", name: "Espanha", dial: "+34" },
  { code: "IT", name: "Itália", dial: "+39" },
  { code: "CN", name: "China", dial: "+86" },
  { code: "IN", name: "Índia", dial: "+91" },
  { code: "RU", name: "Rússia", dial: "+7" },
  { code: "AE", name: "Emirados Árabes", dial: "+971" },
  { code: "SA", name: "Arábia Saudita", dial: "+966" },
  { code: "MA", name: "Marrocos", dial: "+212" },
  { code: "EG", name: "Egito", dial: "+20" },
  { code: "KE", name: "Quénia", dial: "+254" },
  { code: "GH", name: "Gana", dial: "+233" },
  { code: "SN", name: "Senegal", dial: "+221" },
  { code: "CM", name: "Camarões", dial: "+237" },
  { code: "TZ", name: "Tanzânia", dial: "+255" },
  { code: "ET", name: "Etiópia", dial: "+251" },
  { code: "JP", name: "Japão", dial: "+81" },
  { code: "KR", name: "Coreia do Sul", dial: "+82" },
  { code: "AU", name: "Austrália", dial: "+61" },
  { code: "CA", name: "Canadá", dial: "+1" },
  { code: "MX", name: "México", dial: "+52" },
  { code: "AR", name: "Argentina", dial: "+54" },
  { code: "CL", name: "Chile", dial: "+56" },
  { code: "CO", name: "Colômbia", dial: "+57" },
];

/* Sort: Angola first, then CPLP, then alphabetical */
const SORTED_COUNTRIES = [
  COUNTRIES[0], // Angola
  ...COUNTRIES.slice(1, 8), // CPLP
  ...COUNTRIES.slice(8).sort((a, b) => a.name.localeCompare(b.name)),
];

/* Detect country from a phone value string */
function detectCountry(value: string) {
  if (!value) return SORTED_COUNTRIES[0];
  const clean = value.replace(/\s/g, "");
  // Sort dial codes by length descending to match longest first
  const sorted = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);
  for (const c of sorted) {
    if (clean.startsWith(c.dial)) return c;
  }
  return SORTED_COUNTRIES[0];
}

/* Extract number part without dial code */
function extractNumber(value: string, dial: string): string {
  const clean = value.replace(/\s/g, "");
  if (clean.startsWith(dial)) return clean.slice(dial.length).replace(/^\s+/, "");
  // If starts with + but different code, strip it
  if (clean.startsWith("+")) {
    const digits = clean.replace(/^\+\d{1,4}\s*/, "");
    return digits;
  }
  return clean;
}

interface PhoneInputProps {
  value: string;
  onChange: (fullValue: string) => void;
  placeholder?: string;
  className?: string;
  /** compact mode for small inputs like POS */
  compact?: boolean;
}

export default function PhoneInput({ value, onChange, placeholder, className = "", compact = false }: PhoneInputProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const country = detectCountry(value);
  const number = extractNumber(value, country.dial);
  const dropRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const handleCountrySelect = useCallback((c: typeof COUNTRIES[0]) => {
    const num = extractNumber(value, country.dial);
    onChange(`${c.dial} ${num}`);
    setOpen(false);
    setSearch("");
  }, [value, country.dial, onChange]);

  const handleNumberChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const num = e.target.value.replace(/[^\d\s]/g, "");
    onChange(`${country.dial} ${num}`);
  }, [country.dial, onChange]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Focus search when opened
  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50);
  }, [open]);

  const filtered = search
    ? SORTED_COUNTRIES.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.dial.includes(search) ||
          c.code.toLowerCase().includes(search.toLowerCase())
      )
    : SORTED_COUNTRIES;

  const btnH = compact ? "h-7" : "h-10";
  const inputH = compact ? "h-7 text-[11px]" : "h-10 text-sm";
  const flagPx = compact ? 14 : 20;
  const dialSize = compact ? "text-[10px]" : "text-xs";

  return (
    <div className={`relative flex ${className}`} ref={dropRef}>
      {/* Country selector button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`${btnH} flex items-center gap-1 px-2 rounded-l-xl border border-r-0 bg-secondary/50 hover:bg-secondary transition-colors shrink-0`}
      >
        <FlagImg code={country.code} size={flagPx} />
        <span className={`${dialSize} font-medium text-muted-foreground whitespace-nowrap`}>{country.dial}</span>
        <ChevronDown className={`${compact ? "h-2.5 w-2.5" : "h-3 w-3"} text-muted-foreground`} />
      </button>

      {/* Phone number input */}
      <input
        type="tel"
        value={number}
        onChange={handleNumberChange}
        placeholder={placeholder || "9XX XXX XXX"}
        className={`${inputH} flex-1 min-w-0 rounded-r-xl border px-3 bg-background focus:outline-none focus:ring-2 focus:ring-orange-500/20`}
      />

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 top-full mt-1 w-64 max-h-72 bg-popover border rounded-xl shadow-xl z-50 overflow-hidden flex flex-col animate-in fade-in-0 zoom-in-95 duration-150">
          {/* Search */}
          <div className="p-2 border-b">
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar pais..."
              className="w-full h-8 rounded-lg border bg-background px-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            />
          </div>
          {/* Country list */}
          <div className="overflow-y-auto flex-1">
            {filtered.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">Nenhum pais encontrado</div>
            ) : (
              filtered.map((c, i) => (
                <button
                  key={`${c.code}-${i}`}
                  type="button"
                  onClick={() => handleCountrySelect(c)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-accent transition-colors ${
                    c.code === country.code ? "bg-accent/50" : ""
                  }`}
                >
                  <FlagImg code={c.code} size={20} />
                  <span className="text-xs font-medium flex-1 truncate">{c.name}</span>
                  <span className="text-[11px] text-muted-foreground font-mono">{c.dial}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
