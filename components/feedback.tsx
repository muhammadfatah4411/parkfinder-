"use client";

import {
  useEffect,
  useId,
  type ReactNode,
} from "react";
import {
  CheckCircleIcon,
  CloseIcon,
  InfoIcon,
  RefreshIcon,
} from "@/components/icons";

export type NotificationTone = "success" | "error" | "warning" | "info";

const toneStyles: Record<
  NotificationTone,
  { wrapper: string; icon: string; title: string; body: string }
> = {
  success: {
    wrapper: "border-emerald-200 bg-emerald-50",
    icon: "text-emerald-600",
    title: "text-emerald-900",
    body: "text-emerald-800",
  },
  error: {
    wrapper: "border-red-200 bg-red-50",
    icon: "text-red-600",
    title: "text-red-900",
    body: "text-red-800",
  },
  warning: {
    wrapper: "border-amber-200 bg-amber-50",
    icon: "text-amber-600",
    title: "text-amber-900",
    body: "text-amber-800",
  },
  info: {
    wrapper: "border-sky-200 bg-sky-50",
    icon: "text-sky-600",
    title: "text-sky-900",
    body: "text-sky-800",
  },
};

export function Notification({
  tone = "info",
  title,
  children,
  className = "",
}: {
  tone?: NotificationTone;
  title: string;
  children?: ReactNode;
  className?: string;
}) {
  const styles = toneStyles[tone];
  const Icon = tone === "success" ? CheckCircleIcon : InfoIcon;
  const role = tone === "error" || tone === "warning" ? "alert" : "status";

  return (
    <div
      role={role}
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm leading-6 sm:px-5 ${styles.wrapper} ${className}`}
    >
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${styles.icon}`} />
      <div className="min-w-0 flex-1">
        <p className={`font-bold ${styles.title}`}>{title}</p>
        {children ? (
          <div className={`mt-1 break-words text-sm ${styles.body}`}>
            {children}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function LoadingIndicator({
  label = "Loading...",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <p
      role="status"
      aria-live="polite"
      className={`flex items-center justify-center gap-2 text-sm font-medium ${className}`}
    >
      <RefreshIcon className="h-4 w-4 shrink-0 animate-spin" />
      <span>{label}</span>
    </p>
  );
}

export function EmptyState({
  title,
  description,
  icon,
  children,
  className = "",
}: {
  title: string;
  description: string;
  icon?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-3 text-center ${className}`}
    >
      {icon ? <div className="shrink-0">{icon}</div> : null}
      <div>
        <p className="text-sm font-bold text-[#122E52]">{title}</p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
          {description}
        </p>
      </div>
      {children ? <div className="mt-1">{children}</div> : null}
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  isPending = false,
  onConfirm,
  onCancel,
  children,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  isPending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
}) {
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isPending) onCancel();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, isPending, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#051226]/75 px-4 py-6 backdrop-blur-sm sm:px-5 sm:py-8"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isPending) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-busy={isPending}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="max-h-full w-full max-w-md overflow-y-auto rounded-[26px] border border-white/10 bg-white p-6 shadow-2xl sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#122E52] text-[#D8B65B]">
            <InfoIcon className="h-6 w-6" />
          </span>
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            aria-label="Close confirmation"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-[#BB922E]/60 hover:text-[#122E52] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <h2
          id={titleId}
          className="mt-6 text-2xl font-semibold tracking-tight text-[#122E52]"
        >
          {title}
        </h2>
        <p id={descriptionId} className="mt-3 text-sm leading-7 text-slate-600">
          {description}
        </p>

        {children ? <div className="mt-5">{children}</div> : null}

        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            autoFocus
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#122E52]/20 bg-white px-6 py-3.5 text-sm font-bold text-[#122E52] transition hover:border-[#BB922E] hover:bg-[#FBF8F0] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#BB922E] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#BB922E] px-6 py-3.5 text-sm font-bold text-[#0B1F3A] shadow-lg shadow-black/10 transition hover:bg-[#D8B65B] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#D8B65B] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {isPending ? "Please wait..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
