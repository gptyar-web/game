import { useState, type FormEvent } from "react";
import {
  ShieldCheck,
  Play,
  Pause,
  Square,
  RotateCcw,
  Archive,
  Plus,
  Copy,
  Download,
  Send,
  UserPlus,
  Plane,
  Save,
  UserRound,
  TriangleAlert,
} from "lucide-react";
import { useGame } from "../lib/data";
import { client, invoke } from "../lib/supabase";
import { IR } from "../lib/types";
import {
  Button,
  Panel,
  Modal,
  Badge,
  useToast,
  Empty,
} from "../components/ui/core";
import { MatchCreator, ConfirmAction } from "../components/Actions";
import { useUI } from "../stores/ui";
import { PageHeading } from "./Dashboard";
import { datetime, label, errorMessage, downloadJSON } from "../lib/utils";
const ruleLabels: Record<string, string> = {
  mission_seconds: "مدت مأموریت (ثانیه)",
  return_seconds: "مدت بازگشت (ثانیه)",
  repair_seconds: "مدت تعمیر (ثانیه)",
  jam_seconds: "مدت اختلال بازی (ثانیه)",
  mission_credits: "هزینهٔ اعتبار مأموریت",
  mission_energy: "هزینهٔ انرژی مأموریت",
  repair_credits: "هزینهٔ اعتبار تعمیر",
  repair_materials: "مواد لازم برای تعمیر",
  build_credits: "هزینهٔ اعتبار ساخت",
  build_materials: "مواد لازم برای ساخت",
  upgrade_credits: "اعتبار ارتقا",
  upgrade_research: "پژوهش لازم برای ارتقا",
  defense_chance: "احتمال پایهٔ دفاع (۰ تا ۰٫۹)",
  manual_chance: "احتمال دفاع دستی (۰ تا ۰٫۹)",
  damage: "خسارت پایهٔ بازی",
  repair_slots: "ظرفیت پایهٔ تعمیر",
  victory_score: "امتیاز لازم برای پیروزی",
  duration_minutes: "زمان مسابقه (دقیقه)",
  advanced_enabled: "فعال‌بودن واحد پیشرفته",
  maintenance: "توقف اقدامات این مسابقه",
  initial_credits: "اعتبار اولیه",
  initial_energy: "انرژی اولیه",
  initial_materials: "مواد اولیه",
  initial_logistics: "لجستیک اولیه",
  initial_research: "پژوهش اولیه",
  initial_mission_tokens: "اعتبار مأموریت اولیه",
};
export default function Admin() {
  const { data, command, pending, refetch } = useGame(),
    toast = useToast();
  const [tab, setTab] = useState("match"),
    [userModal, setUserModal] = useState(false),
    [credentials, setCredentials] = useState<{
      username: string;
      initial_password: string;
    } | null>(null),
    [busy, setBusy] = useState(false),
    [character, setCharacter] = useState<string | null | undefined>(),
    [unitModal, setUnitModal] = useState(false),
    [typeModal, setTypeModal] = useState(false);
  const m = data.match,
    canConfigure = ["draft", "ready", "paused"].includes(m.status);
  if (data.profile.role !== "admin")
    return <Empty title="این صفحه مخصوص مدیر است" />;
  async function formCommand(
    e: FormEvent<HTMLFormElement>,
    action: string,
    convert?: (
      p: Record<string, FormDataEntryValue>,
    ) => Record<string, unknown>,
  ) {
    e.preventDefault();
    const p = Object.fromEntries(new FormData(e.currentTarget));
    try {
      await command(action, convert ? convert(p) : p);
      toast("تنظیمات ثبت شد.");
    } catch {
      /* reported */
    }
  }
  async function createUser(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const p = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    try {
      const result = await invoke<{
        username: string;
        initial_password: string;
      }>("admin-users", { action: "create", ...p });
      setCredentials(result);
      setUserModal(false);
      refetch();
      toast("حساب ایجاد شد. رمز را همین حالا به‌صورت امن ذخیره کنید.");
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="ADMINISTRATION"
        title="مدیریت کل"
        description="کنترل مسابقه، قوانین، کاربران و سناریو؛ اقدامات مهم در Audit Log ثبت می‌شوند."
      >
        <MatchCreator
          sourceId={m.id}
          onCreated={(id) => useUI.getState().set({ matchId: id })}
        />
        <Button
          variant="secondary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const { data: backup, error } = await client().rpc(
                "game_export_match",
                { p_match_id: m.id },
              );
              if (error) throw error;
              downloadJSON("game-match-backup.json", backup);
              toast("پشتیبان منطقی همین مسابقه دریافت شد.");
            } catch (e) {
              toast(errorMessage(e), "error");
            } finally {
              setBusy(false);
            }
          }}
        >
          <Download size={15} />
          پشتیبان منطقی مسابقه
        </Button>
      </PageHeading>
      <Panel>
        <div className="tab-bar admin-tabs">
          {[
            ["match", "مسابقه"],
            ["users", "کاربران و تیم‌ها"],
            ["rules", "قوانین و اقتصاد"],
            ["scenario", "دارایی‌ها و داستان"],
            ["audit", "گزارش فعالیت"],
          ].map(([v, t]) => (
            <button
              className={tab === v ? "active" : ""}
              onClick={() => setTab(v)}
              key={v}
            >
              {t}
            </button>
          ))}
        </div>
      </Panel>
      {tab === "match" && (
        <>
          <Panel className="admin-section">
            <div className="between">
              <div>
                <h2>{m.name}</h2>
                <p className="muted">
                  {m.description ||
                    "سناریوی رقابتی با دو تیم و داده‌های ساختگی"}
                </p>
              </div>
              <Badge status={m.status} />
            </div>
            <div className="detail-grid">
              <span>
                شناسه
                <strong dir="ltr" className="mono">
                  {m.id.slice(0, 8)}
                </strong>
              </span>
              <span>
                نوع
                <strong>
                  {m.is_test ? "آزمایشی و قابل بازنشانی" : "مسابقهٔ اصلی"}
                </strong>
              </span>
              <span>
                آغاز
                <strong>
                  {m.started_at ? datetime(m.started_at) : "شروع نشده"}
                </strong>
              </span>
            </div>
            <div className="admin-controls">
              {["ready", "draft"].includes(m.status) && (
                <ConfirmAction
                  action="admin_start"
                  title="آغاز مسابقه"
                  description="زمان مسابقه و پردازش سرور آغاز می‌شوند."
                >
                  <Play size={16} />
                  شروع مسابقه
                </ConfirmAction>
              )}
              {m.status === "running" && (
                <ConfirmAction
                  action="admin_pause"
                  title="توقف موقت"
                  description="مأموریت‌ها و تعمیرات متوقف می‌شوند؛ پس از ادامه، زمان‌های پایان جابه‌جا خواهند شد."
                >
                  <Pause size={16} />
                  توقف موقت
                </ConfirmAction>
              )}
              {m.status === "paused" && (
                <ConfirmAction
                  action="admin_resume"
                  title="ادامهٔ مسابقه"
                  description="زمان‌بندی‌های سمت سرور با مدت توقف اصلاح می‌شوند."
                >
                  <Play size={16} />
                  ادامهٔ مسابقه
                </ConfirmAction>
              )}
              {["running", "paused"].includes(m.status) && (
                <ConfirmAction
                  action="admin_end"
                  title="پایان مسابقه و ثبت نتیجه"
                  description="امتیازها تثبیت می‌شوند. مأموریت‌ها و تعمیرات ناتمام متوقف خواهند شد."
                  variant="danger"
                >
                  <Square size={16} />
                  پایان مسابقه
                </ConfirmAction>
              )}
              {m.status === "ended" && (
                <ConfirmAction
                  action="admin_archive"
                  title="آرشیو مسابقه"
                  description="نتیجه و تاریخچه در دسترس می‌مانند."
                >
                  <Archive size={16} />
                  آرشیو
                </ConfirmAction>
              )}
              {m.is_test && m.status !== "running" && (
                <ConfirmAction
                  action="admin_reset"
                  payload={{ confirm: "RESET_TEST" }}
                  title="بازنشانی سناریوی آزمایشی"
                  description="فقط دارایی‌ها و رویدادهای همین مسابقهٔ آزمایشی جایگزین می‌شوند. عضویت کاربران حفظ می‌شود."
                  variant="danger"
                >
                  <RotateCcw size={16} />
                  بازنشانی آزمایشی
                </ConfirmAction>
              )}
            </div>
            <p className="info-inline">
              <ShieldCheck size={16} />
              حساب مدیر برای اجرای عملیات تیمی باید در تب کاربران، عضو یک تیم با
              نقش عملیاتی باشد.
            </p>
          </Panel>
          <div className="two-columns">
            <Panel className="admin-section">
              <h2>پیام عمومی مسابقه</h2>
              <form onSubmit={(e) => void formCommand(e, "admin_message")}>
                <label>
                  متن پیام
                  <textarea name="message" required maxLength={240} />
                </label>
                <Button disabled={pending}>
                  <Send size={16} />
                  انتشار اعلان
                </Button>
              </form>
            </Panel>
            <Panel className="admin-section">
              <h2>حالت نگهداری سامانه</h2>
              <p className="muted">
                این تنظیم اجرای عملیات بازیکنان در تمام مسابقه‌ها را متوقف
                می‌کند. پردازش رویدادهای ثبت‌شده ادامه دارد.
              </p>
              <div className="admin-controls">
                <ConfirmAction
                  action="admin_maintenance"
                  payload={{ enabled: true }}
                  title="فعال‌کردن نگهداری"
                  description="اقدام جدید بازیکنان تا لغو نگهداری رد می‌شود."
                  variant="danger"
                >
                  فعال‌کردن
                </ConfirmAction>
                <ConfirmAction
                  action="admin_maintenance"
                  payload={{ enabled: false }}
                  title="پایان نگهداری"
                  description="اقدامات مجاز بازیکنان دوباره فعال می‌شوند."
                >
                  پایان نگهداری
                </ConfirmAction>
              </div>
            </Panel>
          </div>
        </>
      )}
      {tab === "users" && (
        <Panel>
          <div className="panel-heading">
            <h2>حساب‌ها و عضویت در این مسابقه</h2>
            <Button onClick={() => setUserModal(true)}>
              <UserPlus size={16} />
              کاربر جدید
            </Button>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>کاربر</th>
                  <th>نقش عمومی</th>
                  <th>تیم / نقش در مسابقه</th>
                  <th>حساب</th>
                  <th>بازیابی</th>
                </tr>
              </thead>
              <tbody>
                {data.profiles.map((p) => {
                  const member = data.members.find((m) => m.user_id === p.id);
                  return (
                    <tr key={p.id}>
                      <td>
                        <strong>{p.display_name}</strong>
                        <small dir="ltr">{p.username}</small>
                      </td>
                      <td>
                        <select
                          aria-label={`نقش ${p.username}`}
                          disabled={pending || p.id === data.profile.id}
                          value={p.role}
                          onChange={(e) =>
                            void command("admin_profile", {
                              user_id: p.id,
                              role: e.target.value,
                              disabled: p.disabled,
                            }).catch(() => {})
                          }
                        >
                          {["admin", "player", "spectator"].map((r) => (
                            <option key={r} value={r}>
                              {label(r)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          aria-label={`تیم ${p.username}`}
                          disabled={pending || !canConfigure}
                          value={
                            member
                              ? member.role === "spectator"
                                ? "spectator"
                                : `${member.team_id}:${member.role}`
                              : ""
                          }
                          onChange={(e) => {
                            const value = e.target.value;
                            if (!value) return;
                            const [team_id, role] = value.split(":");
                            void command("admin_member", {
                              user_id: p.id,
                              role: value === "spectator" ? "spectator" : role,
                              team_id: value === "spectator" ? null : team_id,
                            }).catch(() => {});
                          }}
                        >
                          <option value="">عضو نشده</option>
                          <option value="spectator">تماشاچی</option>
                          {data.teams.flatMap((t) =>
                            ["commander", "operator"].map((r) => (
                              <option
                                key={`${t.id}:${r}`}
                                value={`${t.id}:${r}`}
                              >
                                {t.name} · {label(r)}
                              </option>
                            )),
                          )}
                        </select>
                      </td>
                      <td>
                        <Button
                          variant="ghost"
                          disabled={pending || p.id === data.profile.id}
                          onClick={() =>
                            void command("admin_profile", {
                              user_id: p.id,
                              role: p.role,
                              disabled: !p.disabled,
                            }).catch(() => {})
                          }
                        >
                          {p.disabled ? "فعال‌کردن" : "تعلیق"}
                        </Button>
                      </td>
                      <td>
                        <Button
                          variant="ghost"
                          disabled={busy}
                          onClick={async () => {
                            setBusy(true);
                            try {
                              await invoke("admin-users", {
                                action: "recovery",
                                user_id: p.id,
                              });
                              toast(
                                "راهنمای بازیابی به ایمیل ثبت‌شده ارسال شد.",
                              );
                            } catch (e) {
                              toast(errorMessage(e), "error");
                            } finally {
                              setBusy(false);
                            }
                          }}
                        >
                          ارسال راهنما
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="table-footnote">
            تغییر تیم به وضعیت آماده یا متوقف‌شده نیاز دارد. تغییر نقش و تعلیق
            حساب در سرور کنترل می‌شود.
          </p>
        </Panel>
      )}
      {tab === "rules" && (
        <>
          <Panel className="admin-section">
            <h2>قوانین انتزاعی مسابقه</h2>
            <p className="muted">
              تغییر قوانین در حالت آماده یا توقف ممکن است. مقادیر اولیه قبل از
              شروع روی ذخایر اعمال می‌شوند.
            </p>
            <form
              onSubmit={(e) =>
                void formCommand(e, "admin_rules", (p) =>
                  Object.fromEntries(
                    Object.keys(data.rules).map((k) => [
                      k,
                      typeof data.rules[k] === "boolean"
                        ? p[k] === "true"
                        : Number(p[k]),
                    ]),
                  ),
                )
              }
            >
              <div className="rules-grid">
                {Object.entries(data.rules).map(([k, v]) => (
                  <label key={k}>
                    {ruleLabels[k] ?? k}
                    {typeof v === "boolean" ? (
                      <select
                        name={k}
                        defaultValue={String(v)}
                        disabled={!canConfigure}
                      >
                        <option value="true">فعال</option>
                        <option value="false">غیرفعال</option>
                      </select>
                    ) : (
                      <input
                        name={k}
                        type="number"
                        step={k.includes("chance") ? 0.01 : 1}
                        min={
                          k.includes("chance") ||
                          k.includes("credits") ||
                          k.includes("initial")
                            ? 0
                            : undefined
                        }
                        max={k.includes("chance") ? 0.9 : 1000000}
                        defaultValue={v}
                        disabled={!canConfigure}
                        required
                      />
                    )}
                  </label>
                ))}
              </div>
              <Button disabled={pending || !canConfigure}>
                <Save size={16} />
                ثبت قوانین
              </Button>
            </form>
          </Panel>
          <Panel className="admin-section">
            <h2>تنظیم مستقیم منابع تیم</h2>
            <p className="muted">
              عدد مثبت برای افزایش و عدد منفی برای کاهش؛ موجودی منفی توسط سرور
              رد می‌شود.
            </p>
            <form
              onSubmit={(e) =>
                void formCommand(e, "admin_resources", (p) => ({
                  ...p,
                  credits: Number(p.credits),
                  energy: Number(p.energy),
                  materials: Number(p.materials),
                  research: Number(p.research),
                }))
              }
            >
              <div className="rules-grid">
                <label>
                  تیم
                  <select name="team_id">
                    {data.teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>
                {["credits", "energy", "materials", "research"].map((k) => (
                  <label key={k}>
                    {label(k)}
                    <input
                      type="number"
                      name={k}
                      min={-1000000}
                      max={1000000}
                      defaultValue={0}
                    />
                  </label>
                ))}
              </div>
              <Button disabled={pending}>ثبت تراکنش مدیریتی</Button>
            </form>
          </Panel>
        </>
      )}
      {tab === "scenario" && (
        <>
          <div className="admin-controls scenario-tools">
            <Button disabled={!canConfigure} onClick={() => setUnitModal(true)}>
              <Plane size={16} />
              افزودن جنگنده
            </Button>
            <Button onClick={() => setTypeModal(true)}>
              <Plus size={16} />
              نوع سازهٔ جدید
            </Button>
            <Button onClick={() => setCharacter(null)}>
              <UserRound size={16} />
              شخصیت خیالی جدید
            </Button>
          </div>
          <Panel>
            <div className="panel-heading">
              <h2>شخصیت‌های داستانی</h2>
              <span className="muted">نام و اقامتگاه واقعی مجاز نیست</span>
            </div>
            <div className="character-grid">
              {data.characters.map((c) => (
                <div className="character-card" key={c.id}>
                  <span className="character-avatar">
                    {c.first_name.slice(0, 1)}
                  </span>
                  <div>
                    <h3>
                      {c.first_name} {c.last_name}
                    </h3>
                    <p>{c.title}</p>
                    <small>
                      {
                        data.structures.find((s) => s.id === c.residence_id)
                          ?.name
                      }
                    </small>
                    <Badge status={c.status} />
                  </div>
                  <div>
                    <Button variant="ghost" onClick={() => setCharacter(c.id)}>
                      ویرایش
                    </Button>
                    <ConfirmAction
                      action="admin_character_delete"
                      payload={{ id: c.id }}
                      title="حذف شخصیت داستانی"
                      description="فقط شخصیت ساختگی انتخاب‌شده از سناریو حذف می‌شود."
                      variant="danger"
                    >
                      حذف
                    </ConfirmAction>
                  </div>
                </div>
              ))}
            </div>
            {!data.characters.length && <Empty />}
          </Panel>
        </>
      )}
      {tab === "audit" && (
        <Panel>
          <div className="panel-heading">
            <h2>گزارش فعالیت مدیریتی و بازی</h2>
            <Button
              variant="secondary"
              onClick={() => downloadJSON("game-audit-export.json", data.audit)}
            >
              <Download size={15} />
              خروجی گزارش
            </Button>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>زمان</th>
                  <th>کاربر</th>
                  <th>عملیات</th>
                  <th>اطلاعات غیرحساس</th>
                </tr>
              </thead>
              <tbody>
                {data.audit.map((a) => (
                  <tr key={a.id}>
                    <td>{datetime(a.created_at)}</td>
                    <td>
                      {data.profiles.find((p) => p.id === a.actor_id)
                        ?.display_name ?? "پردازش سرور"}
                    </td>
                    <td dir="ltr" className="mono">
                      {a.action}
                    </td>
                    <td dir="ltr" className="mono">
                      {JSON.stringify(a.payload)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
      <Modal
        open={userModal}
        onOpenChange={setUserModal}
        title="ایجاد حساب کاربری"
        description="رمز قوی در سرور ساخته می‌شود و فقط یک‌بار نمایش داده خواهد شد."
      >
        <form onSubmit={createUser}>
          <label>
            نام کاربری انگلیسی
            <input
              name="username"
              dir="ltr"
              pattern="[a-z0-9_]{3,32}"
              autoComplete="off"
              required
            />
          </label>
          <label>
            نام نمایشی
            <input name="display_name" maxLength={80} required />
          </label>
          <label>
            ایمیل بازیابی (اختیاری)
            <input name="email" dir="ltr" type="email" autoComplete="off" />
          </label>
          <label>
            نقش عمومی
            <select name="role">
              <option value="player">بازیکن</option>
              <option value="spectator">تماشاچی</option>
              <option value="admin">مدیر کل</option>
            </select>
          </label>
          <p className="warning-text">
            بدون ایمیل، بازیابی ایمیلی در دسترس نیست. پس از ساخت، تیم کاربر را
            از جدول عضویت تعیین کنید.
          </p>
          <Button disabled={busy}>ایجاد امن حساب</Button>
        </form>
      </Modal>
      <Modal
        open={!!credentials}
        onOpenChange={(v) => {
          if (!v) setCredentials(null);
        }}
        title="اطلاعات ورود اولیه — نمایش یک‌باره"
        description="این اطلاعات را در ابزار امن نگه دارید. پس از بستن پنجره رمز قابل بازیابی از سامانه نیست."
      >
        <div className="one-time-credentials">
          <TriangleAlert />
          <p>رمز را از مسیر خصوصی به صاحب حساب تحویل دهید.</p>
          <label>
            نام کاربری
            <input readOnly dir="ltr" value={credentials?.username ?? ""} />
          </label>
          <label>
            رمز اولیه
            <input
              readOnly
              dir="ltr"
              value={credentials?.initial_password ?? ""}
            />
          </label>
          <Button
            variant="secondary"
            onClick={() => {
              void navigator.clipboard
                .writeText(
                  `Username: ${credentials?.username}\nPassword: ${credentials?.initial_password}`,
                )
                .then(() =>
                  toast("در حافظهٔ موقت کپی شد؛ پس از استفاده پاک کنید."),
                )
                .catch(() =>
                  toast("کپی ممکن نیست؛ متن را انتخاب کنید.", "error"),
                );
            }}
          >
            <Copy size={16} />
            کپی اطلاعات
          </Button>
        </div>
      </Modal>
      <Modal
        open={unitModal}
        onOpenChange={setUnitModal}
        title="افزودن واحد هوایی خیالی"
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const p = Object.fromEntries(new FormData(e.currentTarget));
            try {
              await command("admin_aircraft", p);
              setUnitModal(false);
              toast("واحد جدید ثبت شد.");
            } catch {
              /* reported */
            }
          }}
        >
          <label>
            نام واحد
            <input name="name" maxLength={80} required />
          </label>
          <label>
            محل استقرار
            <select name="home_id">
              {data.structures
                .filter((s) => s.active && s.hp > 0)
                .map((s) => (
                  <option value={s.id} key={s.id}>
                    {s.team_id === IR ? "ایران" : "آمریکا"} · {s.name}
                  </option>
                ))}
            </select>
          </label>
          <label>
            نوع
            <select name="kind">
              <option value="standard">معمولی</option>
              <option value="advanced">پیشرفته</option>
              <option value="stealth">رادارگریز (فقط پایگاه آمریکا)</option>
            </select>
          </label>
          <Button disabled={pending || !canConfigure}>ثبت واحد</Button>
        </form>
      </Modal>
      <Modal
        open={typeModal}
        onOpenChange={setTypeModal}
        title="تعریف نوع سازه"
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const p = Object.fromEntries(new FormData(e.currentTarget));
            try {
              await command("admin_type", p);
              setTypeModal(false);
            } catch {
              /* reported */
            }
          }}
        >
          <label>
            نام نوع جدید
            <input name="name" maxLength={60} required />
          </label>
          <Button disabled={pending}>ثبت نوع</Button>
        </form>
      </Modal>
      <Modal
        open={character !== undefined}
        onOpenChange={(v) => {
          if (!v) setCharacter(undefined);
        }}
        title="شخصیت کاملاً خیالی"
        description="هیچ نام، اطلاعات تماس یا اقامتگاه واقعی ثبت نکنید."
      >
        {character !== undefined &&
          (() => {
            const c = data.characters.find((c) => c.id === character);
            return (
              <form
                key={character ?? "new"}
                onSubmit={async (e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget),
                    p = Object.fromEntries(f);
                  try {
                    await command("admin_character", {
                      ...p,
                      id: character,
                      fictional: f.has("fictional"),
                    });
                    setCharacter(undefined);
                    toast("شخصیت داستانی ثبت شد.");
                  } catch {
                    /* reported */
                  }
                }}
              >
                <div className="form-grid">
                  <label>
                    نام ساختگی
                    <input
                      name="first_name"
                      maxLength={40}
                      defaultValue={c?.first_name}
                      required
                    />
                  </label>
                  <label>
                    نام خانوادگی ساختگی
                    <input
                      name="last_name"
                      maxLength={40}
                      defaultValue={c?.last_name}
                      required
                    />
                  </label>
                </div>
                <label>
                  عنوان داستانی
                  <input
                    name="title"
                    maxLength={80}
                    defaultValue={c?.title}
                    required
                  />
                </label>
                <label>
                  اقامتگاه خیالی
                  <select name="residence_id" defaultValue={c?.residence_id}>
                    {data.structures
                      .filter(
                        (s) =>
                          data.types.find((t) => t.id === s.type_id)?.code ===
                          "residence",
                      )
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.team_id === IR ? "ایران" : "آمریکا"} · {s.name}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  وضعیت داستان
                  <select name="status" defaultValue={c?.status ?? "active"}>
                    <option value="active">فعال</option>
                    <option value="safe">ایمن</option>
                    <option value="lost">درگذشته در داستان</option>
                  </select>
                </label>
                <label className="check-label">
                  <input type="checkbox" name="fictional" required />
                  شخصیت و اقامتگاه کاملاً ساختگی هستند.
                </label>
                <Button disabled={pending}>ثبت شخصیت</Button>
              </form>
            );
          })()}
      </Modal>
    </>
  );
}
