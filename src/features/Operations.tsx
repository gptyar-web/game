import { useState } from "react";
import {
  Plane,
  Target,
  Shield,
  Wrench,
  Timer,
  Plus,
  ArrowUpLeft,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useGame } from "../lib/data";
import { IR } from "../lib/types";
import { Button, Panel, Badge, Health, Empty } from "../components/ui/core";
import { MissionModal, ConfirmAction } from "../components/Actions";
import { PageHeading } from "./Dashboard";
import { fa, label, datetime, progress, remaining } from "../lib/utils";
export function AircraftPage() {
  const { data, canAct } = useGame();
  const [mission, setMission] = useState<string | null>(null);
  return (
    <>
      <PageHeading
        eyebrow="AIR FLEET"
        title="ناوگان هوایی"
        description="واحدهای مجازی، ظرفیت مأموریت و وضعیت آمادگی تیم."
      >
        <span className="muted">
          واحد رادارگریز فقط برای تیم آمریکا تعریف می‌شود.
        </span>
      </PageHeading>
      <div className="unit-grid">
        {data.aircraft.map((a) => (
          <Panel
            key={a.id}
            className={`unit-card ${a.kind === "stealth" ? "stealth-card" : ""}`}
          >
            <div className="between">
              <span className="unit-code" dir="ltr">
                {a.kind.toUpperCase()} / {a.id.slice(0, 6).toUpperCase()}
              </span>
              <Badge status={a.status} />
            </div>
            <div className="aircraft-illustration">
              <Plane size={85} strokeWidth={0.7} />
              <div className="unit-orbit" />
              {a.kind === "stealth" && <span>STEALTH</span>}
            </div>
            <div className="between">
              <h2>{a.name}</h2>
              <span>{a.team_id === IR ? "🇮🇷" : "🇺🇸"}</span>
            </div>
            <span className="muted">
              {label(a.kind)} · سطح {fa(a.level)}
            </span>
            <div className="unit-health">
              <div className="between">
                <span>سلامت</span>
                <span>{fa(a.hp)}٪</span>
              </div>
              <Health value={a.hp} />
              <div className="between">
                <span>
                  <Zap size={12} />
                  انرژی واحد
                </span>
                <span>{fa(a.energy)}٪</span>
              </div>
              <Health value={a.energy} />
            </div>
            <div className="unit-detail">
              <span>
                مأموریت باقی‌مانده<strong>{fa(a.missions_remaining)}</strong>
              </span>
              <span>
                استقرار خیالی
                <strong>
                  {data.structures.find((s) => s.id === a.home_id)?.name ??
                    "پایگاه خودی"}
                </strong>
              </span>
            </div>
            <div className="unit-actions">
              <Button
                disabled={
                  !canAct ||
                  a.team_id !== data.team_id ||
                  a.status !== "ready" ||
                  a.missions_remaining === 0 ||
                  a.energy < 20 ||
                  (a.kind === "advanced" && !data.rules.advanced_enabled)
                }
                onClick={() => setMission(a.id)}
              >
                <Target size={15} />
                تعریف مأموریت
              </Button>
              <ConfirmAction
                action="repair"
                payload={{ aircraft_id: a.id }}
                title="تعمیر و بازیابی انرژی واحد"
                description={`${fa(Number(data.rules.repair_credits))} اعتبار و ${fa(Number(data.rules.repair_materials))} مواد · ${fa(Number(data.rules.repair_seconds))} ثانیه`}
                disabled={
                  !canAct ||
                  a.team_id !== data.team_id ||
                  !["ready", "damaged"].includes(a.status) ||
                  (a.hp === 100 && a.energy === 100) ||
                  a.hp === 0
                }
              >
                <Wrench size={15} />
                تعمیر
              </ConfirmAction>
            </div>
            {a.kind === "advanced" && !data.rules.advanced_enabled && (
              <p className="warning-text">
                این نوع واحد در قوانین مسابقه غیرفعال است.
              </p>
            )}
          </Panel>
        ))}
      </div>
      {!data.aircraft.length && (
        <Panel>
          <Empty title="واحد هوایی قابل مشاهده‌ای ندارید" />
        </Panel>
      )}
      {mission && (
        <MissionModal
          open
          onClose={() => setMission(null)}
          initialAircraft={mission}
        />
      )}
    </>
  );
}
export function DefensePage() {
  const { data, now, command, pending, canAct } = useGame();
  return (
    <>
      <PageHeading
        eyebrow="ABSTRACT DEFENSE"
        title="دفاع هوایی مجازی"
        description="قواعد دفاع صرفاً به امتیاز و احتمال بازی وابسته‌اند؛ مدل عملیاتی واقعی استفاده نمی‌شود."
      >
        <Link className="btn btn-secondary" to="/structures">
          <Plus size={16} />
          ساخت واحد دفاعی
        </Link>
      </PageHeading>
      {data.signals.some(
        (s) => s.jammed && s.jam_until && Date.parse(s.jam_until) > now,
      ) && (
        <div className="warning-banner">
          <Shield />
          <span>
            اختلال نمایشی فعال است. دفاع خودکار در مدت اختلال غیرفعال خواهد بود؛
            از رادار یک ناحیهٔ ساختگی انتخاب کنید.
          </span>
          <Link className="btn btn-primary" to="/radar">
            دفاع دستی
            <ArrowUpLeft size={15} />
          </Link>
        </div>
      )}
      <div className="unit-grid">
        {data.defenses.map((d) => {
          const s = data.structures.find((s) => s.id === d.structure_id);
          const cooling = d.ready_at && Date.parse(d.ready_at) > now;
          return (
            <Panel className="unit-card" key={d.id}>
              <div className="between">
                <span className="stat-icon blue">
                  <Shield size={22} />
                </span>
                <Badge
                  status={
                    !d.active || !s?.active
                      ? "inactive"
                      : cooling
                        ? "preparing"
                        : "ready"
                  }
                />
              </div>
              <h2>{d.name}</h2>
              <p className="muted">
                {s?.name} · {d.team_id === IR ? "ایران" : "آمریکا"}
              </p>
              <Health value={s?.hp ?? 0} max={s?.max_hp ?? 100} />
              <div className="detail-grid">
                <span>
                  سطح<strong>{fa(d.level)}</strong>
                </span>
                <span>
                  امتیاز دفاع<strong>{fa(d.defense_score)}</strong>
                </span>
                <span>
                  فرصت باقی‌مانده<strong>{fa(d.charges)}</strong>
                </span>
                <span>
                  آمادگی بعدی
                  <strong>
                    {cooling ? remaining(d.ready_at!, now) : "آماده"}
                  </strong>
                </span>
              </div>
              <p className="muted">
                احتمال پایهٔ دفاع: {fa(Number(data.rules.defense_chance) * 100)}
                ٪؛ سطح واحد ضریب محدودی اضافه می‌کند.
              </p>
              <div className="unit-actions">
                <Button
                  variant="secondary"
                  disabled={!canAct || d.team_id !== data.team_id || pending}
                  onClick={() =>
                    void command("defense_toggle", {
                      id: d.id,
                      active: !d.active,
                    }).catch(() => {})
                  }
                >
                  {d.active ? "غیرفعال‌کردن" : "فعال‌کردن"}
                </Button>
                <ConfirmAction
                  action="repair"
                  payload={{ structure_id: s?.id }}
                  title="تعمیر پدافند مجازی"
                  description={`${fa(Number(data.rules.repair_credits))} اعتبار و ${fa(Number(data.rules.repair_materials))} مواد`}
                  disabled={
                    !canAct ||
                    d.team_id !== data.team_id ||
                    !s ||
                    s.hp === s.max_hp ||
                    s.status === "repairing"
                  }
                >
                  <Wrench size={15} />
                  تعمیر
                </ConfirmAction>
              </div>
            </Panel>
          );
        })}
      </div>
      {!data.defenses.length && (
        <Panel>
          <Empty title="سامانهٔ دفاعی ثبت نشده است" />
        </Panel>
      )}
    </>
  );
}
export function MissionsPage() {
  const { data, canAct, now } = useGame();
  const [open, setOpen] = useState(false),
    [filter, setFilter] = useState("all");
  const rows = data.missions.filter(
    (m) =>
      filter === "all" ||
      (filter === "active"
        ? ["outbound", "returning"].includes(m.status)
        : !["outbound", "returning"].includes(m.status)),
  );
  return (
    <>
      <PageHeading
        eyebrow="MISSION CONTROL"
        title="کنترل مأموریت‌ها"
        description="هر مأموریت، هزینه، زمان و نتیجهٔ ثبت‌شدهٔ مستقلی دارد."
      >
        <Button disabled={!canAct} onClick={() => setOpen(true)}>
          <Plus size={17} />
          مأموریت جدید
        </Button>
      </PageHeading>
      <Panel>
        <div className="tab-bar">
          {[
            ["all", "همهٔ مأموریت‌ها"],
            ["active", "در جریان"],
            ["finished", "پایان‌یافته"],
          ].map(([v, text]) => (
            <button
              key={v}
              className={filter === v ? "active" : ""}
              onClick={() => setFilter(v)}
            >
              {text}
            </button>
          ))}
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>شناسه / زمان</th>
                <th>واحد</th>
                <th>هدف</th>
                <th>وضعیت</th>
                <th>پیشرفت / نتیجه</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id}>
                  <td>
                    <strong dir="ltr" className="mono">
                      {m.id.slice(0, 8)}
                    </strong>
                    <small>{datetime(m.started_at)}</small>
                  </td>
                  <td>
                    {data.aircraft.find((a) => a.id === m.aircraft_id)?.name ??
                      "واحد مجازی"}
                  </td>
                  <td>
                    {data.contacts.find((c) => c.target_id === m.target_id)
                      ?.label ??
                      data.structures.find((s) => s.id === m.target_id)?.name ??
                      "هدف مجاز"}
                  </td>
                  <td>
                    <Badge status={m.status} />
                  </td>
                  <td>
                    {["outbound", "returning"].includes(m.status) ? (
                      <div className="mission-progress">
                        <span>
                          <Timer size={12} />
                          {remaining(
                            m.status === "outbound"
                              ? m.resolves_at
                              : m.ready_at,
                            now,
                          )}
                        </span>
                        <Health
                          value={progress(
                            m.started_at,
                            m.status === "outbound"
                              ? m.resolves_at
                              : m.ready_at,
                            now,
                          )}
                        />
                      </div>
                    ) : m.result ? (
                      <span>
                        {m.result.defended
                          ? "دفاع رقیب موفق بود"
                          : `خسارت مجازی: ${fa(m.result.damage ?? 0)}`}
                        {m.result.aircraft_lost ? " · واحد ازدست‌رفته" : ""}
                      </span>
                    ) : (
                      "ثبت‌شده"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && <Empty title="مأموریتی در این فهرست نیست" />}
      </Panel>
      {open && <MissionModal open onClose={() => setOpen(false)} />}
    </>
  );
}
export function RepairsPage() {
  const { data, now } = useGame(),
    [filter, setFilter] = useState("active");
  const rows = data.repairs.filter(
    (r) => filter === "all" || r.status === filter,
  );
  return (
    <>
      <PageHeading
        eyebrow="RECOVERY CENTER"
        title="مرکز تعمیرات"
        description="تعمیرها با زمان معتبر سرور ادامه می‌یابند، حتی پس از بسته‌شدن مرورگر."
      >
        <Link className="btn btn-primary" to="/structures">
          <Wrench size={16} />
          انتخاب سازه برای تعمیر
        </Link>
      </PageHeading>
      <div className="info-banner">
        <Timer size={19} />
        <span>
          مدت پایهٔ تعمیر: {fa(Number(data.rules.repair_seconds))} ثانیه · ظرفیت
          پایه: {fa(Number(data.rules.repair_slots))} تعمیر هم‌زمان؛ هر مرکز
          فعال، تا سقف دو ظرفیت اضافه می‌کند.
        </span>
      </div>
      <Panel>
        <div className="tab-bar">
          {[
            ["active", "در حال انجام"],
            ["completed", "تکمیل‌شده"],
            ["all", "همه"],
          ].map(([v, t]) => (
            <button
              key={v}
              className={filter === v ? "active" : ""}
              onClick={() => setFilter(v)}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="repair-list">
          {rows.map((r) => (
            <div key={r.id} className="repair-row">
              <span className="stat-icon amber">
                <Wrench size={20} />
              </span>
              <div>
                <strong>
                  {data.structures.find((s) => s.id === r.structure_id)?.name ??
                    data.aircraft.find((a) => a.id === r.aircraft_id)?.name ??
                    "واحد مجازی"}
                </strong>
                <small>شروع: {datetime(r.started_at)}</small>
              </div>
              <div className="repair-progress">
                <Health
                  value={
                    r.status === "completed"
                      ? 100
                      : progress(r.started_at, r.completes_at, now)
                  }
                />
                <span>
                  {r.status === "active"
                    ? remaining(r.completes_at, now)
                    : label(r.status)}
                </span>
              </div>
              <Badge status={r.status} />
            </div>
          ))}
        </div>
        {!rows.length && <Empty title="تعمیر ثبت‌شده‌ای در این بخش نیست" />}
      </Panel>
    </>
  );
}
