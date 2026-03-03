import { ReactNode, useEffect } from "react";
import { X } from "lucide-react";
import { useAdminTheme } from "@/contexts/AdminThemeContext";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

export default function Modal({ open, onClose, title, children, size = "md" }: ModalProps) {
  const { isDark } = useAdminTheme();

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  const widths = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative w-full ${widths[size]} ${isDark ? "bg-[#1a1c23] border-white/10" : "bg-white border-gray-200"} border rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? "border-white/10" : "border-gray-100"}`}>
          <h3 className={`text-base font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{title}</h3>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${isDark ? "text-white/40 hover:text-white hover:bg-white/10" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"}`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {children}
        </div>
      </div>
    </div>
  );
}
