import { useState, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Crosshair,
  LayoutDashboard,
  Radar,
  Building2,
  Plane,
  Shield,
  Wrench,
  Target,
  Wallet,
  History,
  Bell,
  Trophy,
  Settings,
  ShieldCheck,
  ChevronDown,
  LogOut,
  Menu,
  RefreshCw,
  Volume2,
  VolumeX,
  ArrowUpRight,
  BookOpen,
  X,
} from "lucide-react";
import { useGame } from "../lib/data";
import { useUI } from "../stores/ui";
import { client } from "../lib/supabase";
import { IR, US } from "../lib/types";
import { Button, Badge, Tip, Modal } from "./ui/core";
import { clock, fa, cn } from "../lib/utils";
const pages = [
  { to: "/", text: "مرکز فرماندهی", icon: LayoutDashboard },
  { to: "/radar", text: "رادار عملیاتی", icon: Radar },
  { to: "/structures", text: "سازه‌ها و دارایی‌ها", icon: Building2 },
  { to: "/aircraft", text: "ناوگان هوایی", icon: Plane },
  { to: "/defense", text: "دفاع مجازی", icon: Shield },
  { to: "/missions", text: "مأموریت‌ها", icon: Target },
  { to: "/repairs", text: "مرکز تعمیرات", icon: Wrench },
  { to: "/resources", text: "اقتصاد و منابع", icon: Wallet },
  { to: "/history", text: "تاریخچه و بازپخش", icon: History },
  { to: "/notifications", text: "مرکز اعلان‌ها", icon: Bell },
  { to: "/results", text: "نتایج مسابقه", icon: Trophy },
];
export default function Shell({
  children,
  onSwitch,
}: {
  children: ReactNode;
  onSwitch: () => void;
}) {
  const { data, now, connection, refetch } = useGame(),
    ui = useUI(),
    location = useLocation();
  const [help, setHelp] = useState(false),
    [step, setStep] = useState(0);
  const tutorial = !ui.tutorialDone;
  const admin = data.profile.role === "admin",
    team = data.teams.find((t) => t.id === data.team_id);
  const unread = data.notifications.filter((n) => !n.read).length;
  const title =
    pages.find((p) => p.to === location.pathname)?.text ??
    (location.pathname === "/admin" ? "مدیریت کل" : "تنظیمات شخصی");
  const tips = [
    [
      "به GAME خوش آمدید",
      "تمام نقشه، واحدها و شخصیت‌ها خیالی‌اند. تیم و مجوز شما توسط مدیر مشخص می‌شود.",
    ],
    [
      "خواندن رادار",
      "دایره‌ها دارایی‌ها و لوزی‌های زرد اهداف مجاز هستند. روی نشانگر کلیک کنید؛ با کشیدن نقشه جابه‌جا شوید.",
    ],
    [
      "مأموریت و اقتصاد",
      "پیش از اجرای مأموریت، واحد و هزینه را بررسی کنید. منابع توسط سرور کسر می‌شوند و هر جنگنده یک مأموریت فعال دارد.",
    ],
    [
      "تعمیر و همکاری",
      "از بخش تعمیرات وضعیت واحدهای آسیب‌دیده را پیگیری کنید. تغییرات مجاز هم‌تیمی‌ها و رویدادهای رقیب به‌صورت زنده همگام می‌شوند.",
    ],
  ];
  return (
    <div
      className={cn(
        "app-shell",
        (ui.reduceMotion ||
          window.matchMedia("(prefers-reduced-motion: reduce)").matches) &&
          "reduce-motion",
      )}
    >
      <div
        className={cn("sidebar-overlay", ui.mobileOpen && "visible")}
        onClick={() => ui.set({ mobileOpen: false })}
      />
      <aside className={cn("sidebar", ui.mobileOpen && "open")}>
        <a className="brand" href="#/">
          <span className="brand-icon">
            <Crosshair />
          </span>
          <strong>
            GAME<span>STRATEGIC SIMULATOR</span>
          </strong>
        </a>
        <button className="team-selector" onClick={onSwitch}>
          <span className="team-flag">
            {team?.code === "iran" ? "🇮🇷" : team?.code === "usa" ? "🇺🇸" : "◉"}
          </span>
          <span>
            <strong>
              {admin
                ? "مدیریت کل"
                : team
                  ? `فرماندهی ${team.name}`
                  : "حالت تماشاچی"}
            </strong>
            <small>{data.match.name}</small>
          </span>
          <ChevronDown size={16} />
        </button>
        <span className="nav-caption">فضای عملیات</span>
        <nav>
          {pages.map(({ to, text, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) => cn("nav-link", isActive && "active")}
              onClick={() => ui.set({ mobileOpen: false })}
            >
              <Icon size={18} />
              <span>{text}</span>
              {to === "/notifications" && unread > 0 ? (
                <b>{fa(unread)}</b>
              ) : null}
              {to === "/repairs" &&
              data.repairs.some((r) => r.status === "active") ? (
                <i className="dot amber" />
              ) : null}
            </NavLink>
          ))}
          {admin && (
            <NavLink to="/admin" className="nav-link admin-link">
              <ShieldCheck size={18} />
              مدیریت کل
            </NavLink>
          )}
        </nav>
        <div className="sidebar-bottom">
          <NavLink to="/settings" className="nav-link">
            <Settings size={18} />
            تنظیمات
          </NavLink>
          <Button variant="ghost" onClick={() => setHelp(true)}>
            <BookOpen size={17} />
            راهنمای بازی
            <ArrowUpRight size={14} />
          </Button>
          <div className="user-card">
            <div className="avatar">
              {data.profile.display_name.slice(0, 1)}
            </div>
            <span>
              <strong>{data.profile.display_name}</strong>
              <small>{data.profile.username}</small>
            </span>
            <Tip text="خروج از حساب">
              <Button
                variant="ghost"
                aria-label="خروج از حساب"
                onClick={() => void client().auth.signOut()}
              >
                <LogOut size={17} />
              </Button>
            </Tip>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="topbar-breadcrumb">
            <Button
              variant="ghost"
              className="mobile-menu"
              aria-label="بازکردن منو"
              onClick={() => ui.set({ mobileOpen: true })}
            >
              <Menu size={21} />
            </Button>
            <span>فضای رقابت</span>
            <span className="slash">/</span>
            <strong>{title}</strong>
          </div>
          <div className="topbar-actions">
            {admin && (
              <select
                aria-label="نمای تیم برای مدیر"
                value={data.team_id ?? IR}
                onChange={(e) => ui.set({ viewTeam: e.target.value })}
              >
                <option value={IR}>نمای ایران</option>
                <option value={US}>نمای آمریکا</option>
              </select>
            )}
            <span
              className={cn(
                "connection",
                connection === "connected" && "online",
              )}
            >
              <i />
              {connection === "connected"
                ? "اتصال زنده"
                : connection === "offline"
                  ? "آفلاین"
                  : "اتصال مجدد"}
            </span>
            <span className="header-clock">
              {clock(new Date(now).toISOString())}
              <small>تهران</small>
            </span>
            <Tip text="همگام‌سازی دوباره">
              <Button
                aria-label="همگام‌سازی دوباره"
                variant="ghost"
                onClick={refetch}
              >
                <RefreshCw size={16} />
              </Button>
            </Tip>
            <Tip
              text={ui.sound ? "بی‌صدا کردن اعلان‌ها" : "فعال‌کردن صدای اعلان"}
            >
              <Button
                variant="ghost"
                aria-label="تغییر صدای اعلان"
                onClick={() => ui.set({ sound: !ui.sound })}
              >
                {ui.sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
              </Button>
            </Tip>
            <NavLink
              to="/notifications"
              className="notification-button"
              aria-label={`${fa(unread)} اعلان خوانده‌نشده`}
            >
              <Bell size={19} />
              {unread > 0 && <i />}
            </NavLink>
          </div>
        </header>
        {connection === "offline" && (
          <div className="offline-banner">
            ارتباط قطع شده است. پس از اتصال، اطلاعات از سرور بازیابی می‌شوند.
          </div>
        )}
        <main className="workspace-content">{children}</main>
        <footer className="workspace-footer">
          <span>
            <ShieldCheck size={12} />
            تمام داده‌ها و مختصات این مسابقه ساختگی‌اند.
          </span>
          <span>
            GAME · V1.0 <Badge status={data.match.status} />
          </span>
        </footer>
      </div>
      <Modal
        open={help || tutorial}
        onOpenChange={(v) => {
          setHelp(v);
          if (!v) ui.set({ tutorialDone: true });
        }}
        title={tips[step][0]}
        description="راهنمای شروع سریع"
      >
        <div className="tutorial">
          <div className="tutorial-icon">
            {step === 0 ? (
              <Crosshair />
            ) : step === 1 ? (
              <Radar />
            ) : step === 2 ? (
              <Wallet />
            ) : (
              <Wrench />
            )}
          </div>
          <p>{tips[step][1]}</p>
          <div className="tutorial-dots">
            {tips.map((_, i) => (
              <button
                key={i}
                aria-label={`مرحله ${fa(i + 1)}`}
                className={step === i ? "active" : ""}
                onClick={() => setStep(i)}
              />
            ))}
          </div>
        </div>
        <div className="dialog-actions">
          <Button
            onClick={() => {
              if (step < 3) setStep((s) => s + 1);
              else {
                setHelp(false);
                ui.set({ tutorialDone: true });
                setStep(0);
              }
            }}
          >
            {step === 3 ? "ورود به بازی" : "مرحلهٔ بعد"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setHelp(false);
              ui.set({ tutorialDone: true });
            }}
          >
            <X size={15} />
            بستن راهنما
          </Button>
        </div>
      </Modal>
    </div>
  );
}
