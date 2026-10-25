import { useState, type FormEvent } from "react";
import {
  Settings,
  Volume2,
  Bell,
  Eye,
  LockKeyhole,
  BookOpen,
} from "lucide-react";
import { useUI } from "../stores/ui";
import { useGame } from "../lib/data";
import { client } from "../lib/supabase";
import { Panel, Button, Modal, useToast } from "../components/ui/core";
import { PageHeading } from "./Dashboard";
import { errorMessage, label } from "../lib/utils";
export default function SettingsPage() {
  const ui = useUI(),
    { data } = useGame(),
    toast = useToast();
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false);
  async function update(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (f.get("password") !== f.get("confirm")) {
      toast("رمز و تکرار آن یکسان نیست.", "error");
      return;
    }
    setBusy(true);
    try {
      const { error } = await client().auth.updateUser({
        password: String(f.get("password")),
      });
      if (error) throw error;
      setOpen(false);
      toast("رمز عبور به‌روزرسانی شد.");
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="PREFERENCES"
        title="تنظیمات شخصی"
        description="تجربهٔ نمایش و اعلان‌ها را برای دستگاه خود تنظیم کنید."
      />
      <div className="two-columns">
        <Panel className="settings-panel">
          <h2>
            <Settings size={19} />
            ترجیحات رابط کاربری
          </h2>
          {[
            {
              icon: Volume2,
              key: "sound" as const,
              title: "صدای اعلان‌ها",
              description: "پخش یک صدای کوتاه برای رویدادهای تازه.",
            },
            {
              icon: Bell,
              key: "notifications" as const,
              title: "اعلان شناور",
              description: "نمایش اعلان کوتاه هنگام دریافت رویداد جدید.",
            },
            {
              icon: Eye,
              key: "reduceMotion" as const,
              title: "کاهش انیمیشن‌ها",
              description: "توقف جلوه‌های تزئینی برای دستگاه‌های ضعیف.",
            },
          ].map(({ icon: Icon, key, title, description }) => (
            <label className="setting-row" key={key}>
              <Icon size={19} />
              <span>
                <strong>{title}</strong>
                <small>{description}</small>
              </span>
              <input
                type="checkbox"
                className="switch"
                role="switch"
                checked={ui[key]}
                onChange={(e) => ui.set({ [key]: e.target.checked })}
              />
            </label>
          ))}
          <p className="muted">
            زبان رابط: فارسی · راست‌به‌چپ · زمان‌ها به وقت تهران
          </p>
        </Panel>
        <Panel className="settings-panel">
          <h2>
            <LockKeyhole size={19} />
            حساب و دسترسی
          </h2>
          <div className="detail-grid">
            <span>
              نام نمایشی<strong>{data.profile.display_name}</strong>
            </span>
            <span>
              نام کاربری<strong dir="ltr">{data.profile.username}</strong>
            </span>
            <span>
              نقش حساب<strong>{label(data.profile.role)}</strong>
            </span>
            <span>
              نقش مسابقه
              <strong>
                {data.membership
                  ? label(data.membership.role)
                  : "مدیریت / بدون عضویت تیمی"}
              </strong>
            </span>
          </div>
          <Button variant="secondary" onClick={() => setOpen(true)}>
            تغییر رمز عبور
          </Button>
          <Button
            variant="ghost"
            onClick={() => ui.set({ tutorialDone: false })}
          >
            <BookOpen size={16} />
            نمایش دوبارهٔ آموزش
          </Button>
        </Panel>
      </div>
      <Modal open={open} onOpenChange={setOpen} title="تغییر رمز عبور">
        <form onSubmit={update}>
          <label>
            رمز جدید (۱۲ نویسه، حرف کوچک و بزرگ انگلیسی، عدد و نماد)
            <input
              dir="ltr"
              type="password"
              name="password"
              minLength={12}
              maxLength={128}
              autoComplete="new-password"
              required
            />
          </label>
          <label>
            تکرار رمز
            <input
              dir="ltr"
              type="password"
              name="confirm"
              autoComplete="new-password"
              required
            />
          </label>
          <Button disabled={busy}>ثبت رمز جدید</Button>
        </form>
      </Modal>
    </>
  );
}
