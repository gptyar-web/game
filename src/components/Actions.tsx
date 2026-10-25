import { useState, type FormEvent, type ReactNode } from "react";
import {
  Target,
  ArrowLeft,
  Plane,
  ShieldCheck,
  Coins,
  Zap,
  Plus,
} from "lucide-react";
import { Button, Modal, Badge, useToast } from "./ui/core";
import { useGame, useCommand } from "../lib/data";
import { fa, label } from "../lib/utils";
import type { Contact } from "../lib/types";
export function ConfirmAction({
  action,
  payload = {},
  title,
  description,
  children,
  disabled = false,
  variant = "secondary",
}: {
  action: string;
  payload?: Record<string, unknown>;
  title: string;
  description: string;
  children: ReactNode;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  const [open, setOpen] = useState(false);
  const { command, pending } = useGame(),
    toast = useToast();
  return (
    <>
      <Button
        variant={variant}
        disabled={disabled || pending}
        onClick={() => setOpen(true)}
      >
        {children}
      </Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title={title}
        description={description}
      >
        <div className="confirm-copy">
          <ShieldCheck size={26} />
          <p>
            این اقدام با زمان و منابع ثبت‌شده در سرور انجام می‌شود و در تاریخچه
            ذخیره خواهد شد.
          </p>
        </div>
        <div className="dialog-actions">
          <Button
            variant={variant === "danger" ? "danger" : "primary"}
            disabled={pending}
            onClick={async () => {
              try {
                await command(action, payload);
                setOpen(false);
                toast("درخواست با موفقیت ثبت شد.");
              } catch {
                /* command reports errors */
              }
            }}
          >
            {pending ? "در حال ثبت…" : "تأیید و اجرا"}
          </Button>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            انصراف
          </Button>
        </div>
      </Modal>
    </>
  );
}
export function MissionModal({
  open,
  onClose,
  initialContact,
  initialAircraft,
}: {
  open: boolean;
  onClose: () => void;
  initialContact?: Contact;
  initialAircraft?: string;
}) {
  const { data, command, pending, canAct } = useGame();
  const [contactId, setContactId] = useState(initialContact?.id ?? ""),
    [aircraftId, setAircraftId] = useState(initialAircraft ?? ""),
    [step, setStep] = useState(1);
  const toast = useToast();
  const targets = data.contacts.filter(
      (c) => c.visibility === "identified" && c.health_pct !== 0,
    ),
    aircraft = data.aircraft.filter(
      (a) =>
        a.team_id === data.team_id &&
        a.status === "ready" &&
        a.hp > 0 &&
        a.energy >= 20 &&
        a.missions_remaining > 0 &&
        (a.kind !== "advanced" || data.rules.advanced_enabled),
    );
  const target = targets.find((c) => c.id === contactId),
    unit = aircraft.find((a) => a.id === aircraftId);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (step === 1) {
      setStep(2);
      return;
    }
    try {
      await command("launch", {
        contact_id: contactId,
        aircraft_id: aircraftId,
      });
      toast("مأموریت در سرور ثبت شد.");
      onClose();
    } catch {
      /* reported */
    }
  }
  return (
    <Modal
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
      title="مأموریت رقابتی جدید"
      description="هدف و واحد مجازی را انتخاب کنید؛ نتیجه فقط بر اساس قوانین ساختگی بازی محاسبه می‌شود."
    >
      <div className="steps">
        <span className={step === 1 ? "active" : ""}>۱. انتخاب مأموریت</span>
        <ArrowLeft size={15} />
        <span className={step === 2 ? "active" : ""}>۲. بررسی و تأیید</span>
      </div>
      <form onSubmit={submit}>
        {step === 1 ? (
          <>
            <label>
              هدف شناسایی‌شده
              <select
                required
                value={contactId}
                onChange={(e) => setContactId(e.target.value)}
              >
                <option value="">انتخاب هدف مجاز</option>
                {targets.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label} · سلامت {fa(c.health_pct ?? 0)}٪
                  </option>
                ))}
              </select>
            </label>
            <label>
              جنگندهٔ آماده
              <select
                required
                value={aircraftId}
                onChange={(e) => setAircraftId(e.target.value)}
              >
                <option value="">انتخاب واحد آماده</option>
                {aircraft.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} · {label(a.kind)}
                  </option>
                ))}
              </select>
            </label>
            {!aircraft.length && (
              <p className="warning-text">
                واحد آماده‌ای با انرژی و ظرفیت کافی در اختیار ندارید.
              </p>
            )}
          </>
        ) : (
          <div className="mission-review">
            <div>
              <Target />
              <span>
                هدف رقابتی<strong>{target?.label}</strong>
              </span>
            </div>
            <div>
              <Plane />
              <span>
                واحد انتخاب‌شده
                <strong>
                  {unit?.name} <Badge status={unit?.kind} />
                </strong>
              </span>
            </div>
            <div>
              <Coins />
              <span>
                اعتبار مصرفی
                <strong>{fa(Number(data.rules.mission_credits))}</strong>
              </span>
            </div>
            <div>
              <Zap />
              <span>
                انرژی مصرفی
                <strong>{fa(Number(data.rules.mission_energy))}</strong>
              </span>
            </div>
            <p>
              زمان مأموریت: {fa(Number(data.rules.mission_seconds))} ثانیه · یک
              اعتبار مأموریت و ۲۰ انرژی واحد نیز مصرف می‌شود.
            </p>
          </div>
        )}
        {!canAct && (
          <p className="warning-text">
            اجرای عملیات به عضویت عملیاتی در یک تیم و مسابقهٔ در حال اجرا نیاز
            دارد.
          </p>
        )}
        <div className="dialog-actions">
          <Button disabled={pending || !canAct || !target || !unit}>
            {step === 1
              ? "بررسی مأموریت"
              : pending
                ? "در حال ثبت…"
                : "تأیید و آغاز مأموریت"}
            <Target size={16} />
          </Button>
          {step === 2 ? (
            <Button variant="ghost" type="button" onClick={() => setStep(1)}>
              بازگشت
            </Button>
          ) : null}
        </div>
      </form>
    </Modal>
  );
}
export function MatchCreator({
  onCreated,
  sourceId,
}: {
  onCreated: (id: string) => void;
  sourceId?: string;
}) {
  const [open, setOpen] = useState(false),
    [name, setName] = useState(""),
    [description, setDescription] = useState(""),
    [test, setTest] = useState(true),
    [scheduled, setScheduled] = useState("");
  const { command, isPending } = useCommand();
  const toast = useToast();
  async function submit(e: FormEvent) {
    e.preventDefault();
    try {
      const r = await command("create_match", {
        name,
        description,
        is_test: test,
        source_id: sourceId,
        scheduled_at: scheduled ? new Date(scheduled).toISOString() : null,
      });
      if (r.id) {
        onCreated(r.id);
        setOpen(false);
        toast("مسابقه و سناریوی ساختگی ایجاد شدند.");
      }
    } catch {
      /* reported */
    }
  }
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus size={17} />
        {sourceId ? "مسابقه با تنظیمات مشابه" : "ایجاد مسابقه"}
      </Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="ساخت مسابقهٔ جدید"
        description="یک سناریوی مستقل با دارایی‌های خیالی ایجاد می‌شود. آغاز مسابقه به کنترل مدیر نیاز دارد."
      >
        <form onSubmit={submit}>
          <label>
            نام مسابقه
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              required
            />
          </label>
          <label>
            توضیح
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={240}
            />
          </label>
          <label>
            زمان شروع خودکار (زمان دستگاه)
            <input
              type="datetime-local"
              value={scheduled}
              onChange={(e) => setScheduled(e.target.value)}
            />
            <small>
              در زمان تعیین‌شده، پردازشگر سرور مسابقه را آغاز می‌کند.
            </small>
          </label>
          <label className="check-label">
            <input
              type="checkbox"
              checked={test}
              onChange={(e) => setTest(e.target.checked)}
            />
            مسابقهٔ آزمایشی؛ بازنشانی مجاز باشد
          </label>
          <Button disabled={isPending}>
            {isPending ? "در حال ایجاد…" : "ایجاد سناریو"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
