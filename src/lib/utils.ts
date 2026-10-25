import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export const cn = (...v: ClassValue[]) => twMerge(clsx(v));
export const fa = (n: number | string) =>
  new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 }).format(
    Number(n),
  );
export const datetime = (s: string) =>
  new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Tehran",
  }).format(new Date(s));
export const clock = (s: string) =>
  new Intl.DateTimeFormat("fa-IR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Asia/Tehran",
  }).format(new Date(s));
export function remaining(end: string, now: number) {
  const seconds = Math.max(0, Math.ceil((Date.parse(end) - now) / 1000));
  return `${fa(Math.floor(seconds / 60))}:${String(seconds % 60)
    .padStart(2, "0")
    .replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)])}`;
}
export const progress = (start: string, end: string, now: number) =>
  Math.min(
    100,
    Math.max(
      0,
      (100 * (now - Date.parse(start))) /
        Math.max(1, Date.parse(end) - Date.parse(start)),
    ),
  );
export const labels: Record<string, string> = {
  healthy: "سالم",
  damaged: "آسیب‌دیده",
  needs_repair: "نیازمند تعمیر",
  repairing: "در حال تعمیر",
  repaired: "تعمیر تکمیل‌شده",
  inactive: "غیرفعال",
  destroyed: "ازدست‌رفته",
  ready: "آماده",
  preparing: "در حال آماده‌سازی",
  mission: "در مأموریت",
  returning: "در حال بازگشت",
  outbound: "در مسیر هدف",
  completed: "تکمیل‌شده",
  failed: "ناموفق",
  active: "فعال",
  cancelled: "لغوشده",
  draft: "پیش‌نویس",
  running: "در حال اجرا",
  paused: "متوقف‌شده",
  ended: "پایان‌یافته",
  archived: "آرشیوشده",
  standard: "معمولی",
  advanced: "پیشرفته",
  stealth: "رادارگریز بازی",
  identified: "شناسایی‌شده",
  unknown: "نامشخص",
  hidden: "مخفی",
  commander: "فرمانده",
  operator: "اپراتور",
  spectator: "تماشاچی",
  player: "بازیکن",
  admin: "مدیر کل",
  lost: "درگذشته در داستان",
  safe: "ایمن",
  credits: "اعتبار",
  energy: "انرژی",
  materials: "مواد تعمیراتی",
  logistics: "لجستیک",
  research: "پژوهش",
  mission_tokens: "اعتبار مأموریت",
  construction: "ساخت سازه",
  repair: "تعمیر",
  upgrade: "ارتقا",
  admin_adjustment: "تنظیم مدیر",
  scenario_repair: "تعمیر سناریوی آزمایشی",
};
export const label = (s: string) => labels[s] ?? s;
export function errorMessage(error: unknown) {
  const msg =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error && "message" in error
        ? String(error.message)
        : String(error);
  const map: Record<string, string> = {
    AUTH_REQUIRED: "نشست معتبر نیست؛ دوباره وارد شوید.",
    INVALID_CREDENTIALS: "نام کاربری یا رمز عبور صحیح نیست.",
    RATE_LIMITED: "تعداد تلاش‌ها زیاد است؛ ۱۵ دقیقه دیگر دوباره تلاش کنید.",
    PROFILE_REQUIRED: "حساب فعال بازی پیدا نشد. با مدیر تماس بگیرید.",
    FORBIDDEN: "مجوز این عملیات را ندارید.",
    ADMIN_REQUIRED: "این عملیات مخصوص مدیر است.",
    OPERATOR_REQUIRED: "حساب شما مجوز اجرای عملیات ندارد.",
    MATCH_NOT_RUNNING: "این اقدام فقط در مسابقهٔ در حال اجرا ممکن است.",
    AIRCRAFT_UNAVAILABLE: "این جنگنده آماده نیست یا ظرفیت مأموریت ندارد.",
    INSUFFICIENT_RESOURCES: "منابع کافی برای این اقدام موجود نیست.",
    TARGET_NOT_VISIBLE: "هدف قابل رؤیت و فعال نیست.",
    REPAIR_UNAVAILABLE: "این واحد در حال حاضر قابل تعمیر نیست.",
    REPAIR_SLOTS_FULL: "ظرفیت تعمیرات هم‌زمان تکمیل است.",
    MANUAL_DEFENSE_UNAVAILABLE:
      "فرصت دفاع دستی پایان یافته یا قبلاً استفاده شده است.",
    DEFENSE_UNAVAILABLE: "واحد دفاعی آماده با فرصت کافی ندارید.",
    FICTIONAL_ONLY: "تأیید ساختگی‌بودن داده‌ها الزامی است.",
    FICTIONAL_TEXT_REQUIRED:
      "فقط نام و توضیح ساختگی بنویسید؛ نشانی، لینک و اطلاعات تماس مجاز نیست.",
    OUTSIDE_FICTIONAL_TERRITORY: "مختصات باید داخل قلمرو ساختگی تیم باشد.",
    INVALID_RULES: "مقدار قوانین خارج از محدوده است.",
    INVALID_MATCH_STATE: "وضعیت فعلی مسابقه این اقدام را اجازه نمی‌دهد.",
    TEST_RESET_ONLY: "بازنشانی فقط برای مسابقهٔ آزمایشی متوقف‌شده مجاز است.",
    MAINTENANCE: "سامانه در حالت نگهداری است.",
    IDEMPOTENCY_CONFLICT: "شناسهٔ درخواست با اقدام دیگری استفاده شده است.",
    COMMANDER_REQUIRED: "ویرایش و حذف به نقش فرمانده نیاز دارد.",
    ASSET_BUSY: "سازه در مأموریت یا تعمیر فعال استفاده می‌شود.",
    ADVANCED_DISABLED: "واحد پیشرفته در قوانین این مسابقه غیرفعال است.",
    RECOVERY_EMAIL_REQUIRED: "ایمیل بازیابی برای این حساب ثبت نشده است.",
    USER_CREATE_FAILED:
      "ایجاد حساب ممکن نشد؛ نام کاربری و ایمیل را بررسی کنید.",
  };
  for (const [key, text] of Object.entries(map))
    if (msg.includes(key)) return text;
  return "ارتباط یا اجرای درخواست ناموفق بود. اتصال را بررسی و دوباره تلاش کنید.";
}
export const downloadJSON = (filename: string, value: unknown) => {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
