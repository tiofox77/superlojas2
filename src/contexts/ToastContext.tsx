import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";

type ToastType = "success" | "update" | "error" | "info";

interface ToastItem {
  id: number;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextType {
  toast: {
    success: (title: string, message?: string) => void;
    update: (title: string, message?: string) => void;
    error: (title: string, message?: string) => void;
    info: (title: string, message?: string) => void;
  };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const TOAST_CONFIG: Record<ToastType, { icon: typeof CheckCircle2; bg: string; border: string; text: string; iconColor: string; progress: string }> = {
  success: {
    icon: CheckCircle2,
    bg: "bg-green-50 dark:bg-green-950/40",
    border: "border-green-200 dark:border-green-800",
    text: "text-green-800 dark:text-green-200",
    iconColor: "text-green-500",
    progress: "bg-green-500",
  },
  update: {
    icon: AlertTriangle,
    bg: "bg-amber-50 dark:bg-amber-950/40",
    border: "border-amber-200 dark:border-amber-800",
    text: "text-amber-800 dark:text-amber-200",
    iconColor: "text-amber-500",
    progress: "bg-amber-500",
  },
  error: {
    icon: XCircle,
    bg: "bg-red-50 dark:bg-red-950/40",
    border: "border-red-200 dark:border-red-800",
    text: "text-red-800 dark:text-red-200",
    iconColor: "text-red-500",
    progress: "bg-red-500",
  },
  info: {
    icon: Info,
    bg: "bg-blue-50 dark:bg-blue-950/40",
    border: "border-blue-200 dark:border-blue-800",
    text: "text-blue-800 dark:text-blue-200",
    iconColor: "text-blue-500",
    progress: "bg-blue-500",
  },
};

const TOAST_DURATION = 4000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const addToast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, TOAST_DURATION);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    success: (title: string, message?: string) => addToast("success", title, message),
    update: (title: string, message?: string) => addToast("update", title, message),
    error: (title: string, message?: string) => addToast("error", title, message),
    info: (title: string, message?: string) => addToast("info", title, message),
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => {
            const config = TOAST_CONFIG[t.type];
            const Icon = config.icon;
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, x: 80, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 80, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className={`pointer-events-auto relative overflow-hidden rounded-xl border ${config.bg} ${config.border} shadow-lg backdrop-blur-sm`}
              >
                <div className="flex items-start gap-3 p-3.5">
                  <div className={`shrink-0 mt-0.5 ${config.iconColor}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${config.text}`}>{t.title}</p>
                    {t.message && <p className={`text-xs mt-0.5 ${config.text} opacity-70`}>{t.message}</p>}
                  </div>
                  <button
                    onClick={() => removeToast(t.id)}
                    className={`shrink-0 p-0.5 rounded-lg ${config.text} opacity-40 hover:opacity-100 transition-opacity`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {/* Progress bar */}
                <div className="h-0.5 w-full bg-black/5">
                  <motion.div
                    className={`h-full ${config.progress}`}
                    initial={{ width: "100%" }}
                    animate={{ width: "0%" }}
                    transition={{ duration: TOAST_DURATION / 1000, ease: "linear" }}
                  />
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToastNotification() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToastNotification must be used within ToastProvider");
  return ctx.toast;
}
