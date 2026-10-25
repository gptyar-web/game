import { useState, type FormEvent } from "react";
import {
  Crosshair,
  ArrowLeft,
  LockKeyhole,
  UserRound,
  Eye,
  EyeOff,
  ShieldCheck,
  Radio,
  ScanLine,
  LoaderCircle,
  Info,
  ArrowUpRight,
} from "lucide-react";
import { client, configured, invoke } from "../lib/supabase";
import { Button, Panel, useToast } from "../components/ui/core";
import { errorMessage } from "../lib/utils";
import { useAuth } from "../lib/data";
import { useQueryClient } from "@tanstack/react-query";
export function AuthPage() {
  const [username, setUsername] = useState(""),
    [password, setPassword] = useState(""),
    [show, setShow] = useState(false),
    [pending, setPending] = useState(false),
    [recovery, setRecovery] = useState(false),
    [guide, setGuide] = useState(false);
  const toast = useToast();
  async function submit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      if (recovery) {
        await invoke("auth-session", {
          action: "recover",
          username: username.trim().toLowerCase(),
        });
        toast("در صورت فعال‌بودن حساب و ایمیل بازیابی، راهنما ارسال می‌شود.");
      } else {
        const data = await invoke<{
          access_token: string;
          refresh_token: string;
        }>("auth-session", {
          action: "login",
          username: username.trim().toLowerCase(),
          password,
        });
        const { error } = await client().auth.setSession(data);
        if (error) throw error;
        setPassword("");
      }
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="auth-page">
      <header className="auth-nav">
        <a href="#/" className="brand" aria-label="GAME">
          <span className="brand-icon">
            <Crosshair />
          </span>
          <strong>
            GAME<span>STRATEGIC SIMULATOR</span>
          </strong>
        </a>
        <span className="auth-nav-label">
          <i className="live-dot" />
          محیط رقابت استراتژیک
        </span>
        <Button variant="ghost" onClick={() => setGuide((v) => !v)}>
          راهنمای سامانه <ArrowUpRight size={15} />
        </Button>
      </header>
      <main className="auth-layout">
        <section className="auth-intro">
          <span className="eyebrow">
            <span className="tiny-line" />
            تصمیم شما، جریان بازی را تغییر می‌دهد
          </span>
          <h1>
            هر حرکت،
            <br />
            یک <em>استراتژی.</em>
          </h1>
          <p>
            مرکز فرماندهی خود را در اختیار بگیرید.
            <br />
            دارایی‌ها را مدیریت کنید و در یک دنیای کاملاً خیالی،
            <br />
            با تیم خود برای پیروزی تصمیم بگیرید.
          </p>
          <div className="auth-features">
            <span>
              <Radio size={17} />
              همگام‌سازی زنده
            </span>
            <span>
              <ShieldCheck size={17} />
              دسترسی امن تیمی
            </span>
            <span>
              <ScanLine size={17} />
              رادار تعاملی
            </span>
          </div>
          <div className="auth-radar" aria-hidden="true">
            <div className="auth-radar-grid" />
            <div className="orbit o1" />
            <div className="orbit o2" />
            <div className="orbit o3" />
            <div className="orbit o4" />
            <div className="auth-sweep" />
            <span className="crosshair-x" />
            <span className="crosshair-y" />
            <span className="radar-label rl1">SECTOR A · IRAN</span>
            <span className="radar-label rl2">SECTOR B · USA</span>
            <span className="decor-point p1" />
            <span className="decor-point p2" />
            <span className="decor-point p3" />
            <span className="decor-point p4" />
            <Crosshair className="radar-center" size={32} />
            <span className="illustration-label">
              نقشهٔ انتزاعی · تصویر معرفی بازی
            </span>
          </div>
        </section>
        <div className="auth-form-wrap">
          <Panel className="auth-card">
            <span className="terminal-label">SECURE ACCESS / GAME 01</span>
            <div className="auth-lock">
              <LockKeyhole size={23} />
            </div>
            <h2>{recovery ? "بازیابی دسترسی" : "ورود به مرکز فرماندهی"}</h2>
            <p className="muted">
              {recovery
                ? "نام کاربری حساب خود را وارد کنید."
                : "برای ادامه، اطلاعات حساب خود را وارد کنید."}
            </p>
            {!configured && (
              <div className="setup-notice">
                <Info size={18} />
                <div>
                  <strong>اتصال سرور هنوز تنظیم نشده است</strong>
                  <p>
                    برای فعال‌شدن ورود، نشانی پروژه و کلید عمومی Supabase باید
                    در تنظیمات انتشار ثبت شوند.
                  </p>
                </div>
              </div>
            )}
            <form onSubmit={submit}>
              <label>
                نام کاربری
                <div className="input-icon">
                  <UserRound size={17} />
                  <input
                    aria-label="نام کاربری"
                    dir="ltr"
                    autoComplete="username"
                    placeholder="your_username"
                    pattern="[a-zA-Z0-9_]{3,32}"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
              </label>
              {!recovery && (
                <label>
                  رمز عبور
                  <div className="input-icon">
                    <LockKeyhole size={17} />
                    <input
                      aria-label="رمز عبور"
                      dir="ltr"
                      type={show ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      maxLength={256}
                      required
                    />
                    <button
                      type="button"
                      aria-label={show ? "پنهان‌کردن رمز" : "نمایش رمز"}
                      onClick={() => setShow((v) => !v)}
                    >
                      {show ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </label>
              )}
              <div className="between form-sub">
                <span>
                  <ShieldCheck size={13} />
                  نشست محافظت‌شده
                </span>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setRecovery((v) => !v)}
                >
                  {recovery ? "بازگشت به ورود" : "رمز عبور را فراموش کرده‌اید؟"}
                </button>
              </div>
              <Button
                className="auth-submit"
                disabled={!configured || pending}
                title={
                  !configured ? "تنظیم اتصال Supabase ضروری است" : undefined
                }
              >
                {pending ? <LoaderCircle size={18} className="spin" /> : null}
                {recovery ? "ارسال راهنمای بازیابی" : "ورود به سامانه"}
                <ArrowLeft size={18} />
              </Button>
            </form>
            <div className="auth-divider" />
            <div className="auth-teams">
              <span>🇮🇷 پنل ایران</span>
              <span>🇺🇸 پنل آمریکا</span>
              <span>
                <ShieldCheck size={14} />
                مدیریت کل
              </span>
            </div>
            <p className="auth-note">
              پنل و سطح دسترسی به‌صورت خودکار از حساب شما تعیین می‌شوند. ثبت‌نام
              عمومی بسته است.
            </p>
          </Panel>
          <p className="fictional-note">
            <ShieldCheck size={14} />
            تمام شخصیت‌ها، واحدها و مختصات این بازی ساختگی هستند.
          </p>
        </div>
      </main>
      <footer className="auth-footer">
        <span>GAME — FICTIONAL STRATEGY PLATFORM</span>
        <span>استراتژی. همکاری. رقابت.</span>
        <span>نسخهٔ ۱.۰</span>
      </footer>
      {guide && (
        <div className="guide-float">
          <h3>آغاز یک رقابت تیمی</h3>
          <p>
            مدیر حساب شما و مسابقه را ایجاد می‌کند. پس از ورود، رمز اولیه را
            تغییر دهید. اطلاعات دارایی‌ها، اهداف مجاز و منابع از سرور دریافت
            می‌شوند.
          </p>
          <p>
            برای بازیابی حساب، ایمیل ثبت‌شده توسط مدیر لازم است؛ در صورت نداشتن
            ایمیل با مدیر پروژه تماس بگیرید.
          </p>
          <Button variant="secondary" onClick={() => setGuide(false)}>
            متوجه شدم
          </Button>
        </div>
      )}
    </div>
  );
}
export function PasswordPage() {
  const [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState(""),
    [pending, setPending] = useState(false);
  const toast = useToast(),
    qc = useQueryClient(),
    auth = useAuth();
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast("تکرار رمز عبور یکسان نیست.", "error");
      return;
    }
    setPending(true);
    try {
      const { error } = await client().auth.updateUser({ password });
      if (error) throw error;
      const result = await client().rpc("game_password_changed");
      if (result.error) throw result.error;
      toast("رمز عبور به‌روزرسانی شد.");
      auth.finishRecovery();
      void qc.invalidateQueries();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="center-page">
      <Panel className="auth-card">
        <LockKeyhole className="green-text" size={30} />
        <h2>تنظیم رمز عبور جدید</h2>
        <p className="muted">
          رمز اولیه را تغییر دهید. رمز جدید باید حداقل ۱۲ نویسه و شامل حروف کوچک
          و بزرگ انگلیسی، عدد و نماد باشد.
        </p>
        <form onSubmit={submit}>
          <label>
            رمز جدید
            <input
              type="password"
              dir="ltr"
              minLength={12}
              maxLength={128}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          <label>
            تکرار رمز جدید
            <input
              type="password"
              dir="ltr"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </label>
          <Button disabled={pending}>ثبت رمز جدید</Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => void client().auth.signOut()}
          >
            خروج از حساب
          </Button>
        </form>
      </Panel>
    </div>
  );
}
