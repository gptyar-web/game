import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as Tooltip from "@radix-ui/react-tooltip";
import {
  X,
  CheckCircle2,
  AlertCircle,
  LoaderCircle,
  Inbox,
} from "lucide-react";
import { cn, label } from "../../lib/utils";
import { Button } from "./button";
export { Button } from "./button";
export function Panel({
  children,
  className = "",
  ...p
}: React.HTMLAttributes<HTMLElement>) {
  return (
    <section className={cn("panel", className)} {...p}>
      {children}
    </section>
  );
}
export function Badge({
  status,
  children,
}: {
  status?: string;
  children?: ReactNode;
}) {
  return (
    <span className={cn("badge", status && `status-${status}`)}>
      <i />
      {children ?? label(status ?? "")}
    </span>
  );
}
export function Health({ value, max = 100 }: { value: number; max?: number }) {
  return (
    <span
      className="health"
      aria-label={`سلامت ${Math.round((value / max) * 100)} درصد`}
    >
      <span
        style={{
          width: `${Math.min(100, (value / max) * 100)}%`,
          background:
            value === 0
              ? "var(--red)"
              : value / max < 0.75
                ? "var(--amber)"
                : "var(--green)",
        }}
      />
    </span>
  );
}
export function Tip({ text, children }: { text: string; children: ReactNode }) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content className="tooltip" sideOffset={7}>
          {text}
          <Tooltip.Arrow />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog" dir="rtl">
          <div className="dialog-heading">
            <div>
              <Dialog.Title>{title}</Dialog.Title>
              <Dialog.Description className="muted">
                {description ??
                  "اطلاعات و نتیجهٔ این اقدام توسط سرور بررسی می‌شوند."}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" aria-label="بستن پنجره">
                <X size={19} />
              </Button>
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function Empty({
  title = "اطلاعاتی ثبت نشده است",
  description = "پس از ثبت رویدادهای مجاز، اطلاعات این بخش نمایش داده می‌شود.",
  children,
}: {
  title?: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <Inbox size={30} />
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </div>
  );
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" /> در حال همگام‌سازی با سرور…
    </div>
  );
}
interface ToastItem {
  id: string;
  text: string;
  kind: "success" | "error";
}
const ToastContext = createContext<
  (text: string, kind?: "success" | "error") => void
>(() => {});
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const toast = useCallback(
    (text: string, kind: "success" | "error" = "success") =>
      setItems((x) => [
        ...x.slice(-3),
        { id: crypto.randomUUID(), text, kind },
      ]),
    [],
  );
  useEffect(() => {
    if (!items.length) return;
    const timer = setTimeout(() => setItems((x) => x.slice(1)), 6000);
    return () => clearTimeout(timer);
  }, [items]);
  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {items.map((t) => (
          <div className={`toast ${t.kind}`} key={t.id}>
            {t.kind === "success" ? (
              <CheckCircle2 size={19} />
            ) : (
              <AlertCircle size={19} />
            )}
            <span>{t.text}</span>
            <button
              aria-label="بستن اعلان"
              onClick={() => setItems((x) => x.filter((i) => i.id !== t.id))}
            >
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
export const useToast = () => useContext(ToastContext);
