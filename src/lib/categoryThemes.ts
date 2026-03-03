/**
 * Category-based visual themes for store detail pages.
 * Each category slug maps to a unique color palette and visual style.
 */

export interface CategoryTheme {
  slug: string;
  name: string;
  /** Primary accent color (tailwind class base, e.g. "orange") */
  accent: string;
  /** CSS gradient for banner overlay */
  bannerGradient: string;
  /** CSS gradient for hero/CTA buttons */
  btnGradient: string;
  /** Badge bg + text classes */
  badgeCls: string;
  /** Accent text class */
  accentText: string;
  /** Accent bg class (light) */
  accentBgLight: string;
  /** Section divider / highlight color */
  highlightBorder: string;
  /** Star / rating color override (or keep default warning) */
  ratingColor: string;
  /** Nav active tab underline + text */
  navActive: string;
  /** Category pill active */
  pillActive: string;
  /** Policy icon color */
  policyIconColor: string;
  /** Flash sale accent */
  flashAccent: string;
}

const themes: Record<string, CategoryTheme> = {
  /* ─── Tecnologia & Electronica ─── */
  electronica: {
    slug: "electronica", name: "Electronica",
    accent: "blue",
    bannerGradient: "linear-gradient(to top, rgba(30,64,175,0.85), rgba(30,64,175,0.4), rgba(30,64,175,0.1))",
    btnGradient: "bg-gradient-to-r from-blue-600 to-cyan-500",
    badgeCls: "bg-blue-100 text-blue-700",
    accentText: "text-blue-600",
    accentBgLight: "bg-blue-50",
    highlightBorder: "border-blue-500/30",
    ratingColor: "text-blue-500 fill-blue-500",
    navActive: "border-blue-600 text-blue-600",
    pillActive: "bg-blue-600 text-white",
    policyIconColor: "text-blue-500",
    flashAccent: "border-blue-500/20",
  },
  informatica: {
    slug: "informatica", name: "Informatica",
    accent: "violet",
    bannerGradient: "linear-gradient(to top, rgba(109,40,217,0.85), rgba(109,40,217,0.4), rgba(109,40,217,0.1))",
    btnGradient: "bg-gradient-to-r from-violet-600 to-purple-500",
    badgeCls: "bg-violet-100 text-violet-700",
    accentText: "text-violet-600",
    accentBgLight: "bg-violet-50",
    highlightBorder: "border-violet-500/30",
    ratingColor: "text-violet-500 fill-violet-500",
    navActive: "border-violet-600 text-violet-600",
    pillActive: "bg-violet-600 text-white",
    policyIconColor: "text-violet-500",
    flashAccent: "border-violet-500/20",
  },
  "jogos-consolas": {
    slug: "jogos-consolas", name: "Jogos & Consolas",
    accent: "fuchsia",
    bannerGradient: "linear-gradient(to top, rgba(162,28,175,0.85), rgba(112,26,117,0.5), rgba(88,28,135,0.15))",
    btnGradient: "bg-gradient-to-r from-fuchsia-600 to-purple-500",
    badgeCls: "bg-fuchsia-100 text-fuchsia-700",
    accentText: "text-fuchsia-600",
    accentBgLight: "bg-fuchsia-50",
    highlightBorder: "border-fuchsia-500/30",
    ratingColor: "text-fuchsia-500 fill-fuchsia-500",
    navActive: "border-fuchsia-600 text-fuchsia-600",
    pillActive: "bg-fuchsia-600 text-white",
    policyIconColor: "text-fuchsia-500",
    flashAccent: "border-fuchsia-500/20",
  },

  /* ─── Moda ─── */
  "moda-feminina": {
    slug: "moda-feminina", name: "Moda Feminina",
    accent: "rose",
    bannerGradient: "linear-gradient(to top, rgba(190,18,60,0.8), rgba(190,18,60,0.35), rgba(190,18,60,0.08))",
    btnGradient: "bg-gradient-to-r from-rose-500 to-pink-400",
    badgeCls: "bg-rose-100 text-rose-700",
    accentText: "text-rose-600",
    accentBgLight: "bg-rose-50",
    highlightBorder: "border-rose-400/30",
    ratingColor: "text-rose-500 fill-rose-500",
    navActive: "border-rose-500 text-rose-600",
    pillActive: "bg-rose-500 text-white",
    policyIconColor: "text-rose-500",
    flashAccent: "border-rose-400/20",
  },
  "moda-masculina": {
    slug: "moda-masculina", name: "Moda Masculina",
    accent: "slate",
    bannerGradient: "linear-gradient(to top, rgba(15,23,42,0.9), rgba(30,41,59,0.5), rgba(51,65,85,0.15))",
    btnGradient: "bg-gradient-to-r from-slate-800 to-slate-600",
    badgeCls: "bg-slate-100 text-slate-700",
    accentText: "text-slate-700",
    accentBgLight: "bg-slate-50",
    highlightBorder: "border-slate-400/30",
    ratingColor: "text-amber-500 fill-amber-500",
    navActive: "border-slate-700 text-slate-700",
    pillActive: "bg-slate-800 text-white",
    policyIconColor: "text-slate-600",
    flashAccent: "border-slate-400/20",
  },

  /* ─── Casa & Vida ─── */
  "casa-decoracao": {
    slug: "casa-decoracao", name: "Casa & Decoracao",
    accent: "amber",
    bannerGradient: "linear-gradient(to top, rgba(180,83,9,0.82), rgba(180,83,9,0.38), rgba(180,83,9,0.08))",
    btnGradient: "bg-gradient-to-r from-amber-600 to-orange-400",
    badgeCls: "bg-amber-100 text-amber-800",
    accentText: "text-amber-700",
    accentBgLight: "bg-amber-50",
    highlightBorder: "border-amber-400/30",
    ratingColor: "text-amber-500 fill-amber-500",
    navActive: "border-amber-600 text-amber-700",
    pillActive: "bg-amber-600 text-white",
    policyIconColor: "text-amber-600",
    flashAccent: "border-amber-400/20",
  },
  "bebes-criancas": {
    slug: "bebes-criancas", name: "Bebes & Criancas",
    accent: "sky",
    bannerGradient: "linear-gradient(to top, rgba(14,165,233,0.78), rgba(56,189,248,0.35), rgba(125,211,252,0.1))",
    btnGradient: "bg-gradient-to-r from-sky-500 to-cyan-400",
    badgeCls: "bg-sky-100 text-sky-700",
    accentText: "text-sky-600",
    accentBgLight: "bg-sky-50",
    highlightBorder: "border-sky-400/30",
    ratingColor: "text-sky-500 fill-sky-500",
    navActive: "border-sky-500 text-sky-600",
    pillActive: "bg-sky-500 text-white",
    policyIconColor: "text-sky-500",
    flashAccent: "border-sky-400/20",
  },

  /* ─── Beleza & Saude ─── */
  "beleza-cuidados": {
    slug: "beleza-cuidados", name: "Beleza & Cuidados",
    accent: "pink",
    bannerGradient: "linear-gradient(to top, rgba(219,39,119,0.8), rgba(236,72,153,0.38), rgba(244,114,182,0.1))",
    btnGradient: "bg-gradient-to-r from-pink-500 to-rose-400",
    badgeCls: "bg-pink-100 text-pink-700",
    accentText: "text-pink-600",
    accentBgLight: "bg-pink-50",
    highlightBorder: "border-pink-400/30",
    ratingColor: "text-pink-500 fill-pink-500",
    navActive: "border-pink-500 text-pink-600",
    pillActive: "bg-pink-500 text-white",
    policyIconColor: "text-pink-500",
    flashAccent: "border-pink-400/20",
  },
  "saude-bem-estar": {
    slug: "saude-bem-estar", name: "Saude & Bem-estar",
    accent: "teal",
    bannerGradient: "linear-gradient(to top, rgba(13,148,136,0.82), rgba(20,184,166,0.4), rgba(94,234,212,0.1))",
    btnGradient: "bg-gradient-to-r from-teal-600 to-emerald-500",
    badgeCls: "bg-teal-100 text-teal-700",
    accentText: "text-teal-600",
    accentBgLight: "bg-teal-50",
    highlightBorder: "border-teal-400/30",
    ratingColor: "text-teal-500 fill-teal-500",
    navActive: "border-teal-500 text-teal-600",
    pillActive: "bg-teal-600 text-white",
    policyIconColor: "text-teal-500",
    flashAccent: "border-teal-400/20",
  },

  /* ─── Desporto ─── */
  "desporto-lazer": {
    slug: "desporto-lazer", name: "Desporto & Lazer",
    accent: "emerald",
    bannerGradient: "linear-gradient(to top, rgba(4,120,87,0.85), rgba(16,185,129,0.4), rgba(52,211,153,0.1))",
    btnGradient: "bg-gradient-to-r from-emerald-600 to-green-500",
    badgeCls: "bg-emerald-100 text-emerald-700",
    accentText: "text-emerald-600",
    accentBgLight: "bg-emerald-50",
    highlightBorder: "border-emerald-400/30",
    ratingColor: "text-emerald-500 fill-emerald-500",
    navActive: "border-emerald-500 text-emerald-600",
    pillActive: "bg-emerald-600 text-white",
    policyIconColor: "text-emerald-500",
    flashAccent: "border-emerald-400/20",
  },

  /* ─── Alimentacao ─── */
  "alimentacao-bebidas": {
    slug: "alimentacao-bebidas", name: "Alimentacao & Bebidas",
    accent: "orange",
    bannerGradient: "linear-gradient(to top, rgba(234,88,12,0.82), rgba(249,115,22,0.38), rgba(251,146,60,0.1))",
    btnGradient: "bg-gradient-to-r from-orange-500 to-amber-400",
    badgeCls: "bg-orange-100 text-orange-700",
    accentText: "text-orange-600",
    accentBgLight: "bg-orange-50",
    highlightBorder: "border-orange-400/30",
    ratingColor: "text-orange-500 fill-orange-500",
    navActive: "border-orange-500 text-orange-600",
    pillActive: "bg-orange-500 text-white",
    policyIconColor: "text-orange-500",
    flashAccent: "border-orange-400/20",
  },

  /* ─── Automoveis ─── */
  "automoveis-motas": {
    slug: "automoveis-motas", name: "Automoveis & Motas",
    accent: "red",
    bannerGradient: "linear-gradient(to top, rgba(153,27,27,0.88), rgba(185,28,28,0.45), rgba(220,38,38,0.12))",
    btnGradient: "bg-gradient-to-r from-red-700 to-red-500",
    badgeCls: "bg-red-100 text-red-700",
    accentText: "text-red-600",
    accentBgLight: "bg-red-50",
    highlightBorder: "border-red-500/30",
    ratingColor: "text-red-500 fill-red-500",
    navActive: "border-red-600 text-red-600",
    pillActive: "bg-red-600 text-white",
    policyIconColor: "text-red-600",
    flashAccent: "border-red-500/20",
  },

  /* ─── Livros ─── */
  "livros-papelaria": {
    slug: "livros-papelaria", name: "Livros & Papelaria",
    accent: "yellow",
    bannerGradient: "linear-gradient(to top, rgba(113,63,18,0.85), rgba(161,98,7,0.4), rgba(202,138,4,0.1))",
    btnGradient: "bg-gradient-to-r from-yellow-700 to-amber-500",
    badgeCls: "bg-yellow-100 text-yellow-800",
    accentText: "text-yellow-700",
    accentBgLight: "bg-yellow-50",
    highlightBorder: "border-yellow-500/30",
    ratingColor: "text-yellow-600 fill-yellow-600",
    navActive: "border-yellow-600 text-yellow-700",
    pillActive: "bg-yellow-700 text-white",
    policyIconColor: "text-yellow-600",
    flashAccent: "border-yellow-400/20",
  },

  /* ─── Ferramentas ─── */
  "ferramentas-construcao": {
    slug: "ferramentas-construcao", name: "Ferramentas & Construcao",
    accent: "orange",
    bannerGradient: "linear-gradient(to top, rgba(124,45,18,0.88), rgba(194,65,12,0.42), rgba(234,88,12,0.1))",
    btnGradient: "bg-gradient-to-r from-orange-700 to-orange-500",
    badgeCls: "bg-orange-100 text-orange-800",
    accentText: "text-orange-700",
    accentBgLight: "bg-orange-50",
    highlightBorder: "border-orange-500/30",
    ratingColor: "text-orange-500 fill-orange-500",
    navActive: "border-orange-600 text-orange-700",
    pillActive: "bg-orange-700 text-white",
    policyIconColor: "text-orange-600",
    flashAccent: "border-orange-500/20",
  },

  /* ─── Animais ─── */
  animais: {
    slug: "animais", name: "Animais",
    accent: "lime",
    bannerGradient: "linear-gradient(to top, rgba(63,98,18,0.85), rgba(77,124,15,0.4), rgba(132,204,22,0.1))",
    btnGradient: "bg-gradient-to-r from-lime-700 to-green-500",
    badgeCls: "bg-lime-100 text-lime-800",
    accentText: "text-lime-700",
    accentBgLight: "bg-lime-50",
    highlightBorder: "border-lime-500/30",
    ratingColor: "text-lime-600 fill-lime-600",
    navActive: "border-lime-600 text-lime-700",
    pillActive: "bg-lime-700 text-white",
    policyIconColor: "text-lime-600",
    flashAccent: "border-lime-400/20",
  },

  /* ─── Musica ─── */
  "musica-instrumentos": {
    slug: "musica-instrumentos", name: "Musica & Instrumentos",
    accent: "indigo",
    bannerGradient: "linear-gradient(to top, rgba(55,48,163,0.88), rgba(79,70,229,0.42), rgba(99,102,241,0.1))",
    btnGradient: "bg-gradient-to-r from-indigo-700 to-violet-500",
    badgeCls: "bg-indigo-100 text-indigo-700",
    accentText: "text-indigo-600",
    accentBgLight: "bg-indigo-50",
    highlightBorder: "border-indigo-500/30",
    ratingColor: "text-indigo-500 fill-indigo-500",
    navActive: "border-indigo-600 text-indigo-600",
    pillActive: "bg-indigo-600 text-white",
    policyIconColor: "text-indigo-500",
    flashAccent: "border-indigo-400/20",
  },

  /* ─── Escritorio ─── */
  "escritorio-material": {
    slug: "escritorio-material", name: "Escritorio & Material",
    accent: "gray",
    bannerGradient: "linear-gradient(to top, rgba(55,65,81,0.88), rgba(75,85,99,0.45), rgba(107,114,128,0.12))",
    btnGradient: "bg-gradient-to-r from-gray-700 to-gray-500",
    badgeCls: "bg-gray-100 text-gray-700",
    accentText: "text-gray-600",
    accentBgLight: "bg-gray-50",
    highlightBorder: "border-gray-400/30",
    ratingColor: "text-amber-500 fill-amber-500",
    navActive: "border-gray-600 text-gray-700",
    pillActive: "bg-gray-700 text-white",
    policyIconColor: "text-gray-500",
    flashAccent: "border-gray-400/20",
  },

  /* ─── Servicos ─── */
  servicos: {
    slug: "servicos", name: "Servicos",
    accent: "cyan",
    bannerGradient: "linear-gradient(to top, rgba(8,145,178,0.85), rgba(6,182,212,0.4), rgba(34,211,238,0.1))",
    btnGradient: "bg-gradient-to-r from-cyan-600 to-teal-500",
    badgeCls: "bg-cyan-100 text-cyan-700",
    accentText: "text-cyan-600",
    accentBgLight: "bg-cyan-50",
    highlightBorder: "border-cyan-400/30",
    ratingColor: "text-cyan-500 fill-cyan-500",
    navActive: "border-cyan-600 text-cyan-600",
    pillActive: "bg-cyan-600 text-white",
    policyIconColor: "text-cyan-500",
    flashAccent: "border-cyan-400/20",
  },

  /* ─── Imoveis ─── */
  imoveis: {
    slug: "imoveis", name: "Imoveis",
    accent: "blue",
    bannerGradient: "linear-gradient(to top, rgba(30,58,138,0.9), rgba(29,78,216,0.45), rgba(59,130,246,0.1))",
    btnGradient: "bg-gradient-to-r from-blue-900 to-blue-600",
    badgeCls: "bg-blue-100 text-blue-800",
    accentText: "text-blue-800",
    accentBgLight: "bg-blue-50",
    highlightBorder: "border-blue-600/30",
    ratingColor: "text-amber-500 fill-amber-500",
    navActive: "border-blue-800 text-blue-800",
    pillActive: "bg-blue-800 text-white",
    policyIconColor: "text-blue-700",
    flashAccent: "border-blue-500/20",
  },

  /* ─── Agricultura ─── */
  agricultura: {
    slug: "agricultura", name: "Agricultura",
    accent: "green",
    bannerGradient: "linear-gradient(to top, rgba(20,83,45,0.88), rgba(22,101,52,0.42), rgba(34,197,94,0.1))",
    btnGradient: "bg-gradient-to-r from-green-800 to-emerald-500",
    badgeCls: "bg-green-100 text-green-800",
    accentText: "text-green-700",
    accentBgLight: "bg-green-50",
    highlightBorder: "border-green-500/30",
    ratingColor: "text-green-600 fill-green-600",
    navActive: "border-green-700 text-green-700",
    pillActive: "bg-green-700 text-white",
    policyIconColor: "text-green-600",
    flashAccent: "border-green-400/20",
  },
};

/** Default theme when no category match or feature disabled */
export const defaultTheme: CategoryTheme = {
  slug: "default", name: "Padrao",
  accent: "primary",
  bannerGradient: "linear-gradient(to top, rgba(0,0,0,0.8), rgba(0,0,0,0.4), rgba(0,0,0,0.1))",
  btnGradient: "bg-hero-gradient",
  badgeCls: "bg-primary/10 text-primary",
  accentText: "text-primary",
  accentBgLight: "bg-primary/5",
  highlightBorder: "border-primary/20",
  ratingColor: "text-warning fill-warning",
  navActive: "border-primary text-primary",
  pillActive: "bg-primary text-primary-foreground",
  policyIconColor: "text-primary",
  flashAccent: "border-destructive/20",
};

/**
 * Get theme for a store based on its categories array.
 * Uses the first matching category.
 */
export function getCategoryTheme(storeCategories?: string[]): CategoryTheme {
  if (!storeCategories || storeCategories.length === 0) return defaultTheme;

  // Try to match category name → slug
  for (const cat of storeCategories) {
    const slug = cat
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[&]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    if (themes[slug]) return themes[slug];
  }

  // Partial match fallback
  for (const cat of storeCategories) {
    const lower = cat.toLowerCase();
    for (const [key, theme] of Object.entries(themes)) {
      if (lower.includes(key.replace(/-/g, " ")) || key.replace(/-/g, " ").includes(lower)) {
        return theme;
      }
    }
  }

  return defaultTheme;
}

export default themes;
