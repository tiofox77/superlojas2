import { useAdminTheme } from "@/contexts/AdminThemeContext";

export function useAdminStyles() {
  const { isDark } = useAdminTheme();
  return {
    isDark,
    card: isDark ? "bg-[#1a1c23] border-white/[0.06]" : "bg-white border-gray-200 shadow-sm",
    cardHover: isDark ? "hover:bg-[#1e2028] hover:border-white/10" : "hover:shadow-md hover:border-gray-300",
    textPrimary: isDark ? "text-white" : "text-gray-900",
    textSecondary: isDark ? "text-white/60" : "text-gray-600",
    textMuted: isDark ? "text-white/30" : "text-gray-400",
    border: isDark ? "border-white/[0.06]" : "border-gray-200",
    borderLight: isDark ? "border-white/[0.04]" : "border-gray-100",
    input: isDark
      ? "bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/30 focus:border-orange-500/50"
      : "bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-orange-500 focus:bg-white",
    hoverRow: isDark ? "hover:bg-white/[0.02]" : "hover:bg-gray-50",
    thText: isDark ? "text-white/30" : "text-gray-400",
    btnPrimary: "bg-orange-500 hover:bg-orange-600 text-white",
    btnSecondary: isDark
      ? "bg-white/[0.06] text-white/60 hover:bg-white/[0.1] border border-white/[0.08]"
      : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200",
    btnDanger: "bg-red-500 hover:bg-red-600 text-white",
    empty: isDark ? "text-white/20" : "text-gray-300",
    skeleton: isDark ? "bg-white/[0.06]" : "bg-gray-200",
    badge: (color: string) => {
      const map: Record<string, string> = {
        green: isDark ? "bg-green-500/15 text-green-400" : "bg-green-50 text-green-600 ring-1 ring-green-200",
        amber: isDark ? "bg-amber-500/15 text-amber-400" : "bg-amber-50 text-amber-600 ring-1 ring-amber-200",
        red: isDark ? "bg-red-500/15 text-red-400" : "bg-red-50 text-red-600 ring-1 ring-red-200",
        blue: isDark ? "bg-blue-500/15 text-blue-400" : "bg-blue-50 text-blue-600 ring-1 ring-blue-200",
        orange: isDark ? "bg-orange-500/15 text-orange-400" : "bg-orange-50 text-orange-600 ring-1 ring-orange-200",
        purple: isDark ? "bg-purple-500/15 text-purple-400" : "bg-purple-50 text-purple-600 ring-1 ring-purple-200",
        gray: isDark ? "bg-white/10 text-white/50" : "bg-gray-100 text-gray-500 ring-1 ring-gray-200",
      };
      return map[color] || map.gray;
    },
  };
}
