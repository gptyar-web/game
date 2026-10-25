import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import {
  Coins,
  Zap,
  Boxes,
  Truck,
  FlaskConical,
  Ticket,
  Bell,
  CheckCheck,
  Volume2,
  Download,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Printer,
  Trophy,
  Search,
  ChevronLeft,
} from "lucide-react";
import { useGame } from "../lib/data";
import { client } from "../lib/supabase";
import { useUI } from "../stores/ui";
import { IR, type GameEvent } from "../lib/types";
import {
  Panel,
  Button,
  Badge,
  Empty,
  Loading,
  Modal,
} from "../components/ui/core";
import { PageHeading } from "./Dashboard";
import Radar from "../components/Radar";
import { datetime, fa, label, downloadJSON, cn } from "../lib/utils";
const ScoreChart = lazy(() =>
    import("./Charts").then((m) => ({ default: m.ScoreChart })),
  ),
  ComparisonChart = lazy(() =>
    import("./Charts").then((m) => ({ default: m.ComparisonChart })),
  ),
  ResourceChart = lazy(() =>
    import("./Charts").then((m) => ({ default: m.ResourceChart })),
  ),
  HealthChart = lazy(() =>
    import("./Charts").then((m) => ({ default: m.HealthChart })),
  );
export function ResourcesPage() {
  const { data } = useGame(),
    r = data.resources.find((r) => r.team_id === data.team_id);
  return (
    <>
      <PageHeading
        eyebrow="TEAM ECONOMY"
        title="اقتصاد و منابع"
        description="هر تغییر موجودی با تراکنش اتمیک و دلیل مشخص در سرور ثبت می‌شود."
      >
        <Button
          variant="secondary"
          onClick={() =>
            downloadJSON("game-resource-ledger.json", {
              match: data.match.name,
              transactions: data.transactions,
            })
          }
        >
          <Download size={15} />
          خروجی گردش منابع
        </Button>
      </PageHeading>
      {r ? (
        <div className="resource-cards">
          {[
            { key: "credits", icon: Coins, color: "amber" },
            { key: "energy", icon: Zap, color: "blue" },
            { key: "materials", icon: Boxes, color: "green" },
            { key: "logistics", icon: Truck, color: "purple" },
            { key: "research", icon: FlaskConical, color: "blue" },
            { key: "mission_tokens", icon: Ticket, color: "green" },
          ].map(({ key, icon: Icon, color }) => (
            <Panel className="resource-card" key={key}>
              <span className={`stat-icon ${color}`}>
                <Icon size={23} />
              </span>
              <span>{label(key)}</span>
              <strong>{fa(r[key as keyof typeof r] as number)}</strong>
            </Panel>
          ))}
        </div>
      ) : (
        <Panel>
          <Empty title="منابع تیم برای این نقش قابل مشاهده نیست" />
        </Panel>
      )}
      <div className="two-columns charts-row">
        <Panel>
          <div className="panel-heading">
            <h2>روند منابع تیم</h2>
          </div>
          <Suspense fallback={<Loading />}>
            <ResourceChart events={data.events} />
          </Suspense>
        </Panel>
        <Panel>
          <div className="panel-heading">
            <h2>هزینه‌های پایهٔ بازی</h2>
          </div>
          <div className="cost-list">
            <div>
              <span>مأموریت</span>
              <strong>
                {fa(Number(data.rules.mission_credits))} اعتبار +{" "}
                {fa(Number(data.rules.mission_energy))} انرژی + ۱ اعتبار مأموریت
              </strong>
            </div>
            <div>
              <span>تعمیر</span>
              <strong>
                {fa(Number(data.rules.repair_credits))} اعتبار +{" "}
                {fa(Number(data.rules.repair_materials))} مواد
              </strong>
            </div>
            <div>
              <span>ساخت</span>
              <strong>
                {fa(Number(data.rules.build_credits))} اعتبار +{" "}
                {fa(Number(data.rules.build_materials))} مواد + ۱ لجستیک
              </strong>
            </div>
            <div>
              <span>ارتقا</span>
              <strong>
                {fa(Number(data.rules.upgrade_credits))} اعتبار +{" "}
                {fa(Number(data.rules.upgrade_research))} پژوهش
              </strong>
            </div>
          </div>
        </Panel>
      </div>
      <Panel>
        <div className="panel-heading">
          <h2>دفتر تراکنش‌ها</h2>
          <span className="muted">۱۰۰ مورد اخیر و مجاز</span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>زمان ثبت</th>
                <th>تیم</th>
                <th>علت</th>
                <th>تغییرات منابع</th>
              </tr>
            </thead>
            <tbody>
              {data.transactions.map((t) => (
                <tr key={t.id}>
                  <td>{datetime(t.created_at)}</td>
                  <td>{t.team_id === IR ? "ایران" : "آمریکا"}</td>
                  <td>{label(t.reason)}</td>
                  <td>
                    <div className="delta-list">
                      {Object.entries(t.delta)
                        .filter(([, v]) => v !== 0)
                        .map(([k, v]) => (
                          <span
                            key={k}
                            className={
                              Number(v) < 0 ? "red-text" : "green-text"
                            }
                          >
                            {label(k)}:{" "}
                            <b dir="ltr">
                              {Number(v) > 0 ? "+" : ""}
                              {fa(v ?? 0)}
                            </b>
                          </span>
                        ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!data.transactions.length && <Empty />}
      </Panel>
    </>
  );
}
export function NotificationsPage() {
  const { data, command, pending } = useGame(),
    ui = useUI();
  const [filter, setFilter] = useState("all");
  const rows = data.notifications.filter((n) =>
    filter === "unread"
      ? !n.read
      : filter === "all"
        ? true
        : n.kind.includes(filter),
  );
  return (
    <>
      <PageHeading
        eyebrow="NOTIFICATION CENTER"
        title="مرکز اعلان‌ها"
        description="اعلان‌های مسابقه و پیام‌های مربوط به تیم شما."
      >
        <Button
          variant="secondary"
          onClick={() => ui.set({ sound: !ui.sound })}
        >
          <Volume2 size={15} />
          {ui.sound ? "صدا روشن است" : "صدا خاموش است"}
        </Button>
        <Button
          disabled={pending || !data.notifications.some((n) => !n.read)}
          onClick={() => void command("mark_read").catch(() => {})}
        >
          <CheckCheck size={16} />
          خواندن همه
        </Button>
      </PageHeading>
      <Panel>
        <div className="table-toolbar">
          <div className="tab-bar">
            {[
              ["all", "همه"],
              ["unread", "خوانده‌نشده"],
              ["mission", "مأموریت"],
              ["repair", "تعمیر"],
              ["jam", "اختلال"],
              ["admin", "مدیریت"],
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
        </div>
        <div className="notice-list">
          {rows.map((n) => (
            <button
              key={n.id}
              className={cn("notice", !n.read && "unread")}
              onClick={() => {
                if (!n.read)
                  void command("mark_read", { id: n.id }).catch(() => {});
              }}
            >
              <span className="notice-icon">
                <Bell size={19} />
              </span>
              <span>
                <strong>{n.title}</strong>
                <p>{n.body || "رویداد در تاریخچهٔ مسابقه ثبت شده است."}</p>
                <small>{datetime(n.created_at)}</small>
              </span>
              {!n.read && <i className="live-dot" />}
            </button>
          ))}
        </div>
        {!rows.length && <Empty title="اعلانی در این فیلتر نیست" />}
      </Panel>
    </>
  );
}
export function HistoryPage() {
  const { data } = useGame();
  const [older, setOlder] = useState<GameEvent[]>([]),
    [loading, setLoading] = useState(false),
    [hasOlder, setHasOlder] = useState(data.events.length >= 500),
    [playing, setPlaying] = useState(false),
    [speed, setSpeed] = useState(1),
    [filter, setFilter] = useState(""),
    [details, setDetails] = useState<GameEvent | null>(null);
  const events = useMemo(
    () =>
      [
        ...new Map([...older, ...data.events].map((e) => [e.id, e])).values(),
      ].sort((a, b) => a.seq - b.seq),
    [older, data.events],
  );
  const start = Date.parse(events[0]?.created_at ?? data.server_time),
    end = Math.max(
      start + 1000,
      Date.parse(events.at(-1)?.created_at ?? data.server_time),
    );
  const [cursor, setCursor] = useState(start);
  const current = events
      .filter((e) => Date.parse(e.created_at) <= cursor)
      .at(-1),
    state = events
      .filter((e) => e.state && Date.parse(e.created_at) <= cursor)
      .at(-1)?.state;
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(
      () =>
        setCursor((t) => {
          if (t + 200 * speed >= end) {
            setPlaying(false);
            return end;
          }
          return t + 200 * speed;
        }),
      200,
    );
    return () => clearInterval(timer);
  }, [playing, speed, end]);
  async function loadOlder() {
    setLoading(true);
    try {
      let q = client()
        .from("game_events")
        .select("*")
        .eq("match_id", data.match.id)
        .lt("seq", events[0]?.seq ?? Number.MAX_SAFE_INTEGER)
        .order("seq", { ascending: false })
        .limit(300);
      q = data.team_id
        ? q.or(`team_id.is.null,team_id.eq.${data.team_id}`)
        : q.is("team_id", null);
      const { data: rows, error } = await q;
      if (error) throw error;
      setOlder((x) => [...x, ...(rows as GameEvent[])]);
      setHasOlder(rows.length === 300);
    } finally {
      setLoading(false);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="MATCH TIMELINE"
        title="تاریخچه و بازپخش"
        description="بازپخش از وضعیت‌های ذخیره‌شده ساخته می‌شود و مسابقهٔ اصلی را تغییر نمی‌دهد."
      >
        <Button
          variant="secondary"
          onClick={() =>
            downloadJSON("game-visible-history.json", {
              match: data.match.name,
              team: data.team_id,
              events,
            })
          }
        >
          <Download size={15} />
          خروجی رویدادهای مجاز
        </Button>
      </PageHeading>
      <div className="replay-layout">
        <Panel className="replay-map">
          <div className="panel-heading">
            <h2>بازپخش ثبت‌شده</h2>
            <Badge>
              {current ? datetime(current.created_at) : "ابتدای بازه"}
            </Badge>
          </div>
          <Radar
            structures={state?.structures ?? []}
            contacts={state?.contacts ?? []}
            signals={state?.signals ?? []}
            missions={state?.missions ?? []}
            effects={events}
            types={data.types}
            teamId={data.team_id}
            now={cursor}
            compact
            replay
          />
          <div className="replay-controls">
            <Button
              variant="ghost"
              aria-label="ابتدای بازپخش"
              onClick={() => {
                setPlaying(false);
                setCursor(start);
              }}
            >
              <SkipBack size={18} />
            </Button>
            <Button
              aria-label={playing ? "توقف بازپخش" : "پخش بازپخش"}
              disabled={!events.length}
              onClick={() => {
                if (cursor >= end) setCursor(start);
                setPlaying((v) => !v);
              }}
            >
              {playing ? <Pause size={17} /> : <Play size={17} />}
            </Button>
            <Button
              variant="ghost"
              aria-label="انتهای بازپخش"
              onClick={() => {
                setPlaying(false);
                setCursor(end);
              }}
            >
              <SkipForward size={18} />
            </Button>
            <input
              aria-label="زمان بازپخش"
              type="range"
              min={start}
              max={end}
              value={Math.max(start, Math.min(end, cursor))}
              onChange={(e) => {
                setPlaying(false);
                setCursor(Number(e.target.value));
              }}
            />
            <select
              aria-label="سرعت بازپخش"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
            >
              {[0.5, 1, 2, 4, 8].map((n) => (
                <option key={n} value={n}>
                  {fa(n)}×
                </option>
              ))}
            </select>
          </div>
          <p className="replay-note">
            بازپخش در بازهٔ رویدادهای بارگذاری‌شده است. برای گسترش بازه،
            رویدادهای قدیمی‌تر را دریافت کنید.
          </p>
        </Panel>
        <Panel className="timeline-panel">
          <div className="search-field">
            <Search size={16} />
            <input
              aria-label="جست‌وجوی تاریخچه"
              placeholder="جست‌وجوی رویداد…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
          <div className="timeline">
            {events
              .filter((e) => e.title.includes(filter))
              .slice()
              .reverse()
              .map((e) => (
                <div
                  key={e.id}
                  className={cn(
                    "timeline-item",
                    current?.id === e.id && "selected",
                  )}
                >
                  <button
                    onClick={() => {
                      setCursor(Date.parse(e.created_at));
                      setPlaying(false);
                    }}
                  >
                    <i />
                    <span>
                      <strong>{e.title}</strong>
                      <small>{datetime(e.created_at)}</small>
                    </span>
                  </button>
                  <Button
                    variant="ghost"
                    aria-label={`جزئیات ${e.title}`}
                    onClick={() => setDetails(e)}
                  >
                    <ChevronLeft size={15} />
                  </Button>
                </div>
              ))}
          </div>
          {hasOlder && (
            <Button
              variant="secondary"
              disabled={loading}
              onClick={() => void loadOlder().catch(() => {})}
            >
              {loading ? "دریافت…" : "رویدادهای قدیمی‌تر"}
            </Button>
          )}
          {!events.length && <Empty />}
        </Panel>
      </div>
      <Modal
        open={!!details}
        onOpenChange={(v) => {
          if (!v) setDetails(null);
        }}
        title={details?.title ?? "جزئیات رویداد"}
      >
        <div className="detail-grid">
          <span>
            زمان<strong>{details && datetime(details.created_at)}</strong>
          </span>
          <span>
            ترتیب<strong>{fa(details?.seq ?? 0)}</strong>
          </span>
        </div>
        <pre dir="ltr" className="json-view">
          {JSON.stringify(details?.payload, null, 2)}
        </pre>
      </Modal>
    </>
  );
}
export function ResultsPage() {
  const { data } = useGame(),
    result = data.match.result;
  return (
    <>
      <PageHeading
        eyebrow="MATCH REPORT"
        title="گزارش و نتایج مسابقه"
        description={
          result
            ? "نتیجهٔ نهایی معتبر و ثبت‌شده در سرور."
            : "آمار زنده؛ برنده پس از پایان مسابقه تعیین می‌شود."
        }
      >
        <Button variant="secondary" onClick={() => window.print()}>
          <Printer size={16} />
          چاپ گزارش
        </Button>
        <Button
          variant="secondary"
          onClick={() =>
            downloadJSON("game-match-report.json", {
              match: data.match,
              scores: data.scores,
            })
          }
        >
          <Download size={15} />
          دریافت گزارش
        </Button>
      </PageHeading>
      {result && (
        <Panel className="winner-panel">
          <Trophy size={45} />
          <div>
            <span className="eyebrow">نتیجهٔ نهایی</span>
            <h2>
              {result.winner
                ? `پیروزی تیم ${result.winner === IR ? "ایران 🇮🇷" : "آمریکا 🇺🇸"}`
                : "مسابقه با تساوی پایان یافت"}
            </h2>
            <p>
              {data.match.name} · {fa(result.mission_count)} مأموریت ثبت‌شده
            </p>
          </div>
        </Panel>
      )}
      <div className="score-report-grid">
        {data.scores.map((s) => (
          <Panel key={s.id} className="score-report">
            <div className="between">
              <h2>{s.team_id === IR ? "🇮🇷 ایران" : "🇺🇸 آمریکا"}</h2>
              <strong className={s.team_id === IR ? "green-text" : "blue-text"}>
                {fa(s.score)}
              </strong>
            </div>
            <div className="detail-grid">
              {[
                ["مأموریت موفق", s.successful_missions],
                ["دفاع موفق", s.successful_defenses],
                ["واحد ازدست‌رفته", s.losses],
                ["خسارت واردشده", s.damage],
                ["تعمیر تکمیل‌شده", s.repairs],
              ].map(([t, n]) => (
                <span key={String(t)}>
                  {t}
                  <strong>{fa(n)}</strong>
                </span>
              ))}
            </div>
          </Panel>
        ))}
      </div>
      <div className="two-columns charts-row">
        <Panel>
          <div className="panel-heading">
            <h2>روند تغییر امتیاز</h2>
          </div>
          <Suspense fallback={<Loading />}>
            <ScoreChart events={data.events} />
          </Suspense>
        </Panel>
        <Panel>
          <div className="panel-heading">
            <h2>مقایسهٔ عملکرد تیم‌ها</h2>
          </div>
          <Suspense fallback={<Loading />}>
            <ComparisonChart scores={data.scores} />
          </Suspense>
        </Panel>
        <Panel>
          <div className="panel-heading">
            <h2>سلامت زیرساخت‌های مجاز</h2>
          </div>
          <Suspense fallback={<Loading />}>
            <HealthChart events={data.events} />
          </Suspense>
        </Panel>
        <Panel>
          <div className="panel-heading">
            <h2>رویدادهای مهم</h2>
          </div>
          <div className="event-mini-list">
            {data.events
              .filter(
                (e) =>
                  e.kind.includes("resolved") ||
                  e.kind.includes("ended") ||
                  e.kind.includes("lost"),
              )
              .slice(-8)
              .reverse()
              .map((e) => (
                <div key={e.id}>
                  <i className="event-dot green" />
                  <span>
                    <strong>{e.title}</strong>
                    <small>{datetime(e.created_at)}</small>
                  </span>
                </div>
              ))}
          </div>
        </Panel>
      </div>
    </>
  );
}
