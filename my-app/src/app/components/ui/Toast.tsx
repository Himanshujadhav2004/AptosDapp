"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

type ToastKind = "success" | "error" | "info" | "warning";

type ToastItem = {
  id: number;
  kind: ToastKind;
  title?: string;
  message: string;
};

type ToastContextType = {
  push: (t: Omit<ToastItem, "id">) => void;
};

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast(): ToastContextType {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const push = useCallback((t: Omit<ToastItem, "id">) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev, { id, ...t }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 3000);
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[2000] space-y-3 w-[340px]">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            aria-live="polite"
            className={
              "rounded-xl border px-4 py-3 shadow-md text-sm flex items-start gap-3 bg-background/90 backdrop-blur-sm animate-[toast-in_200ms_ease-out] " +
              (t.kind === "success"
                ? "border-green-500/30"
                : t.kind === "error"
                ? "border-red-500/30"
                : t.kind === "warning"
                ? "border-yellow-500/30"
                : "border-primary/30")
            }
          >
            <div className={
              "mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 " +
              (t.kind === "success"
                ? "bg-green-500/20 text-green-400"
                : t.kind === "error"
                ? "bg-red-500/20 text-red-400"
                : t.kind === "warning"
                ? "bg-yellow-500/20 text-yellow-400"
                : "bg-primary/20 text-primary")
            }>
              {t.kind === "success" && <span>✓</span>}
              {t.kind === "error" && <span>✕</span>}
              {t.kind === "warning" && <span>!</span>}
              {t.kind === "info" && <span>i</span>}
            </div>
            <div className="flex-1 text-foreground/90">
              <div className="flex items-start justify-between gap-3">
                <strong className="text-foreground text-sm font-semibold">
                  {t.title ?? (t.kind === "success" ? "Success" : t.kind === "error" ? "Error" : t.kind === "warning" ? "Warning" : "Information")}
                </strong>
                <button
                  aria-label="Close"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
                >
                  ×
                </button>
              </div>
              <p className="text-xs mt-1 text-muted-foreground">{t.message}</p>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

// subtle slide-in
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _styles = `
@keyframes toast-in { from { transform: translateY(8px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
`;


