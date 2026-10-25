import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Target,
  ArrowUpLeft,
  Building2,
  Plane,
  ShieldCheck,
  Activity,
  Coins,
  Zap,
  Boxes,
  Wrench,
  Radio,
  ChevronLeft,
  Clock3,
  Flag,
  TriangleAlert,
} from "lucide-react";
import { motion } from "motion/react";
import { useGame } from "../lib/data";
import { IR, type Contact } from "../lib/types";
import { fa, label, clock, remaining, progress } from "../lib/utils";
import { Button, Panel, Badge, Health, Empty } from "../components/ui/core";
import Radar from "../components/Radar";
import { MissionModal } from "../components/Actions";
export function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="page-heading-actions">{children}</div>
    </div>
  );
}
export default function Dashboard({
  radarOnly = false,
}: {
  radarOnly?: boolean;
}) {
  const { data, now, command, pending, canAct } = useGame();
  const [mission, setMission] = useState(false),
    [target, setTarget] = useState<Contact>();
  const own = data.structures.filter((s) => s.team_id === data.team_id),
    fleet = data.aircraft.filter((a) => a.team_id === data.team_id),
    resources = data.resources.find((r) => r.team_id === data.team_id);
  const score = data.scores.find((s) => s.team_id === data.team_id),
    other = data.scores.find((s) => s.team_id !== data.team_id),
    team = data.teams.find((t) => t.id === data.team_id),
    activeMissions = data.missions.filter(
      (m) =>
        ["outbound", "returning"].includes(m.status) &&
        m.team_id === data.team_id,
    ),
    repairs = data.repairs.filter(
      (r) => r.status === "active" && r.team_id === data.team_id,
    ),
    damaged = own.filter((s) => s.hp < s.max_hp);
  const openMission = (c?: Contact) => {
    setTarget(c);
    setMission(true);
  };
  return (
    <>
      <PageHeading
        eyebrow={radarOnly ? "TACTICAL RADAR" : "COMMAND CENTER"}
        title={
          radarOnly
            ? "رادار قلمرو خیالی"
            : team
              ? `مرکز فرماندهی ${team.name}`
              : "اتاق تماشای مسابقه"
        }
        description={
          radarOnly
            ? "مشاهدهٔ دارایی‌ها، اهداف مجاز و مسیر مأموریت‌های ثبت‌شده."
            : `تصویر زندهٔ دارایی‌ها، منابع و جریان رقابت · ${data.match.name}`
        }
      >
        <Badge status={data.match.status} />
        <Button
          disabled={!canAct}
          title={
            !canAct ? "نیازمند نقش عملیاتی و مسابقهٔ در حال اجرا" : undefined
          }
          onClick={() => openMission()}
        >
          <Target size={17} />
          مأموریت جدید
        </Button>
      </PageHeading>
      {!radarOnly && (
        <>
          <div className="match-overview">
            <div className="match-overview-name">
              <Flag size={18} />
              <div>
                <strong>{data.match.name}</strong>
                <span>
                  {data.match.is_test
                    ? "سناریوی آزمایشی و مستقل"
                    : "مسابقهٔ تیمی"}
                </span>
              </div>
            </div>
            <div className="score-versus">
              <span className="team-score iran">
                🇮🇷 ایران{" "}
                <strong>
                  {fa(data.scores.find((s) => s.team_id === IR)?.score ?? 0)}
                </strong>
              </span>
              <span className="versus">VS</span>
              <span className="team-score usa">
                <strong>
                  {fa(data.scores.find((s) => s.team_id !== IR)?.score ?? 0)}
                </strong>{" "}
                آمریکا 🇺🇸
              </span>
            </div>
            <span className="match-time">
              <Clock3 size={15} />
              {data.match.ends_at && data.match.status === "running"
                ? remaining(data.match.ends_at, now)
                : label(data.match.status)}
              <small>زمان باقی‌مانده</small>
            </span>
          </div>
          <div className="stat-grid">
            {[
              {
                icon: Building2,
                title: "سازه‌های فعال",
                value: own.filter((s) => s.active && s.hp > 0).length,
                total: own.length,
                sub: `${fa(damaged.length)} سازه نیازمند توجه`,
                color: "green",
              },
              {
                icon: Plane,
                title: "واحدهای هوایی آماده",
                value: fleet.filter((a) => a.status === "ready").length,
                total: fleet.length,
                sub: `${fa(activeMissions.length)} مأموریت در جریان`,
                color: "blue",
              },
              {
                icon: ShieldCheck,
                title: "دفاع‌های موفق",
                value: score?.successful_defenses ?? 0,
                sub: "بر اساس رویدادهای ثبت‌شده",
                color: "purple",
              },
              {
                icon: Activity,
                title: "امتیاز رقابتی",
                value: score?.score ?? 0,
                sub: other
                  ? `رقیب: ${fa(other.score)} امتیاز`
                  : "در انتظار شروع رقابت",
                color: "amber",
              },
            ].map(({ icon: Icon, ...s }, i) => (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                key={s.title}
              >
                <Panel className="stat-card">
                  <div className="between">
                    <span>{s.title}</span>
                    <span className={`stat-icon ${s.color}`}>
                      <Icon size={19} />
                    </span>
                  </div>
                  <div className="stat-value">
                    {fa(s.value)}
                    {"total" in s && <small> / {fa(s.total ?? 0)}</small>}
                  </div>
                  <span className="stat-caption">
                    <i className={`dot ${s.color}`} />
                    {s.sub}
                  </span>
                </Panel>
              </motion.div>
            ))}
          </div>
          {resources && (
            <div className="resource-strip">
              <span className="resource-strip-title">
                ذخایر تیم<span>RESOURCES</span>
              </span>
              {[
                { key: "credits", icon: Coins },
                { key: "energy", icon: Zap },
                { key: "materials", icon: Boxes },
                { key: "logistics", icon: Wrench },
              ].map(({ key, icon: Icon }) => (
                <div key={key}>
                  <Icon size={17} />
                  <span>{label(key)}</span>
                  <strong>
                    {fa(resources[key as keyof typeof resources] as number)}
                  </strong>
                </div>
              ))}
              <Link to="/resources">
                جزئیات
                <ArrowUpLeft size={15} />
              </Link>
            </div>
          )}
        </>
      )}
      <div className={radarOnly ? "radar-full-layout" : "dashboard-grid"}>
        <Panel className="radar-panel">
          <div className="panel-heading">
            <h2>
              <Radio size={17} />
              رادار میدان بازی
            </h2>
            <div>
              <span className="live-tag">
                <i className="live-dot" />
                همگام با سرور
              </span>
              {!radarOnly && (
                <Link
                  className="icon-link"
                  to="/radar"
                  aria-label="بازکردن رادار کامل"
                >
                  <ArrowUpLeft size={18} />
                </Link>
              )}
            </div>
          </div>
          <Radar
            structures={data.profile.role === "admin" ? data.structures : own}
            contacts={data.contacts}
            missions={data.missions}
            signals={data.signals}
            effects={data.events}
            types={data.types}
            teamId={data.team_id}
            now={now}
            onTarget={openMission}
            onManual={
              canAct
                ? (mission_id, region) => {
                    void command("manual_defense", {
                      mission_id,
                      region,
                    }).catch(() => {});
                  }
                : undefined
            }
            pending={pending}
            compact={!radarOnly}
          />
        </Panel>
        <div className="operations-column">
          <Panel>
            <div className="panel-heading">
              <h2>جریان عملیات</h2>
              <span className="count">{fa(activeMissions.length)}</span>
            </div>
            {!activeMissions.length ? (
              <Empty
                title="آسمان آرام است"
                description="مأموریت فعالی برای تیم شما ثبت نشده است."
              />
            ) : (
              <div className="operation-list">
                {activeMissions.map((m) => (
                  <div className="operation-item" key={m.id}>
                    <span className="operation-icon">
                      <Plane size={18} />
                    </span>
                    <div>
                      <strong>
                        {fleet.find((a) => a.id === m.aircraft_id)?.name ??
                          "واحد مجازی"}
                      </strong>
                      <span>
                        {label(m.status)} ·{" "}
                        {remaining(
                          m.status === "returning" ? m.ready_at : m.resolves_at,
                          now,
                        )}
                      </span>
                      <Health
                        value={progress(m.started_at, m.resolves_at, now)}
                      />
                    </div>
                    <Badge status={m.status} />
                  </div>
                ))}
              </div>
            )}
            <Link className="panel-link" to="/missions">
              همهٔ مأموریت‌ها
              <ChevronLeft size={15} />
            </Link>
          </Panel>
          <Panel>
            <div className="panel-heading">
              <h2>
                <Wrench size={16} />
                تعمیرات در جریان
              </h2>
              <span className="count">{fa(repairs.length)}</span>
            </div>
            <div className="repair-mini">
              {repairs.slice(0, 3).map((r) => (
                <div key={r.id}>
                  <div className="between">
                    <strong>
                      {own.find((s) => s.id === r.structure_id)?.name ??
                        fleet.find((a) => a.id === r.aircraft_id)?.name ??
                        "واحد مجازی"}
                    </strong>
                    <span className="amber-text">
                      {remaining(r.completes_at, now)}
                    </span>
                  </div>
                  <Health value={progress(r.started_at, r.completes_at, now)} />
                </div>
              ))}
              {!repairs.length && (
                <p className="muted">تعمیر فعالی وجود ندارد.</p>
              )}
            </div>
            <Link className="panel-link" to="/repairs">
              مرکز تعمیرات
              <ChevronLeft size={15} />
            </Link>
          </Panel>
          <Panel className="briefing-card">
            <div className="briefing-icon">
              <TriangleAlert size={19} />
            </div>
            <span className="eyebrow">اطلاعات میدان</span>
            <h3>دید محدود، تصمیم آگاهانه</h3>
            <p>
              فقط اهداف شناسایی‌شده قابل انتخاب هستند. اطلاعات مخفی تیم مقابل از
              سرور ارسال نمی‌شوند.
            </p>
            <div>
              <span className="dot amber" />
              {fa(
                data.contacts.filter((c) => c.visibility === "unknown").length,
              )}{" "}
              تماس نامشخص
            </div>
          </Panel>
        </div>
      </div>
      {!radarOnly && (
        <div className="dashboard-bottom">
          <Panel>
            <div className="panel-heading">
              <h2>وضعیت زیرساخت‌ها</h2>
              <Link to="/structures">
                همهٔ دارایی‌ها
                <ArrowUpLeft size={15} />
              </Link>
            </div>
            <div className="asset-mini-list">
              {own.slice(0, 5).map((s) => (
                <div key={s.id}>
                  <span className="asset-mini-icon">
                    <Building2 size={17} />
                  </span>
                  <span>
                    <strong>{s.name}</strong>
                    <small>
                      {data.types.find((t) => t.id === s.type_id)?.name}
                    </small>
                  </span>
                  <div>
                    <Health value={s.hp} max={s.max_hp} />
                    <small>{fa(Math.round((s.hp / s.max_hp) * 100))}٪</small>
                  </div>
                  <Badge status={s.status} />
                </div>
              ))}
            </div>
            {!own.length && <Empty title="دادهٔ اختصاصی تیم در دسترس نیست" />}
          </Panel>
          <Panel>
            <div className="panel-heading">
              <h2>آخرین رویدادها</h2>
              <Link to="/history">
                تاریخچه
                <ArrowUpLeft size={15} />
              </Link>
            </div>
            <div className="event-mini-list">
              {data.events
                .slice(-5)
                .reverse()
                .map((e) => (
                  <div key={e.id}>
                    <i
                      className={`event-dot ${e.kind.includes("repair") ? "amber" : e.kind.includes("resolved") ? "blue" : "green"}`}
                    />
                    <span>
                      <strong>{e.title}</strong>
                      <small>
                        {typeof e.payload.message === "string"
                          ? e.payload.message
                          : "رویداد معتبر بازی"}
                      </small>
                    </span>
                    <time>{clock(e.created_at)}</time>
                  </div>
                ))}
            </div>
            {!data.events.length && <Empty />}
          </Panel>
        </div>
      )}
      {mission && (
        <MissionModal
          open={mission}
          onClose={() => setMission(false)}
          initialContact={target}
        />
      )}
    </>
  );
}
