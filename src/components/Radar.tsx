import {
  useState,
  useRef,
  useId,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  Plus,
  Minus,
  Maximize2,
  Layers,
  LocateFixed,
  ShieldAlert,
  X,
  Target,
  Navigation,
  Radio,
} from "lucide-react";
import { Button, Badge, Tip } from "./ui/core";
import { useUI } from "../stores/ui";
import {
  IR,
  type Structure,
  type Contact,
  type Mission,
  type Signal,
  type StructureType,
  type GameEvent,
} from "../lib/types";
import { cn, fa, progress } from "../lib/utils";
interface Props {
  structures: Structure[];
  contacts: Contact[];
  missions?: Mission[];
  signals?: Signal[];
  types: StructureType[];
  effects?: GameEvent[];
  teamId: string | null;
  now: number;
  onTarget?: (c: Contact) => void;
  onManual?: (missionId: string, region: number) => void;
  pending?: boolean;
  compact?: boolean;
  replay?: boolean;
}
export default function Radar({
  structures,
  contacts,
  missions = [],
  signals = [],
  effects = [],
  types,
  teamId,
  now,
  onTarget,
  onManual,
  pending,
  compact,
  replay,
}: Props) {
  const [view, setView] = useState({ x: 0, y: 0, z: 1 }),
    [grid, setGrid] = useState(true),
    [manual, setManual] = useState(false);
  const { selectedId, set } = useUI();
  const svg = useRef<SVGSVGElement>(null),
    drag = useRef<{ x: number; y: number; vx: number; vy: number } | null>(
      null,
    );
  const id = useId().replace(/:/g, "");
  const selected = structures.find((s) => s.id === selectedId),
    contact = contacts.find((c) => c.id === selectedId);
  const jam = signals.find(
    (s) => s.jammed && s.jam_until && Date.parse(s.jam_until) > now,
  );
  const pointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    if ((e.target as Element).closest("[data-marker]")) return;
    svg.current?.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
  };
  const pointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (drag.current && svg.current) {
      const ratio = 1000 / svg.current.getBoundingClientRect().width;
      setView((v) => ({
        ...v,
        x: Math.max(
          -600,
          Math.min(
            600,
            drag.current!.vx + (e.clientX - drag.current!.x) * ratio,
          ),
        ),
        y: Math.max(
          -600,
          Math.min(
            600,
            drag.current!.vy + (e.clientY - drag.current!.y) * ratio,
          ),
        ),
      }));
    }
  };
  const zoom = (n: number) =>
    setView((v) => ({ ...v, z: Math.max(0.65, Math.min(3, v.z + n)) }));
  const statusColor = (s: Structure) =>
    s.hp === 0 || !s.active
      ? "var(--red)"
      : s.status === "repairing"
        ? "var(--amber)"
        : s.hp < s.max_hp
          ? "#fb923c"
          : s.team_id === IR
            ? "var(--green)"
            : "var(--blue)";
  const select = (id: string) => set({ selectedId: id });
  const fly = (
    key: string,
    x: number,
    y: number,
    tx: number,
    ty: number,
    started: string,
    end: string,
    color: string,
  ) => {
    const p = progress(started, end, now) / 100;
    const cx = x + (tx - x) * p,
      cy = y + (ty - y) * p;
    return (
      <g key={key} className="flight">
        <path
          d={`M${x},${y} L${tx},${ty}`}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeDasharray="5 8"
          opacity=".4"
        />
        <circle
          cx={tx}
          cy={ty}
          r="15"
          fill="none"
          stroke={color}
          opacity=".3"
        />
        <g
          transform={`translate(${cx} ${cy}) rotate(${(Math.atan2(ty - y, tx - x) * 180) / Math.PI + 90})`}
        >
          <path
            d="M0 -12 L4 -1 L12 6 L4 5 L2 12 L-2 12 L-4 5 L-12 6 L-4 -1 Z"
            fill={color}
          />
          <circle r="22" fill={color} opacity=".08" />
        </g>
      </g>
    );
  };
  return (
    <div
      className={cn("radar", compact && "radar-compact", jam && "radar-jammed")}
    >
      <div className="radar-top">
        <span>
          <i className="live-dot" />
          {replay ? "بازپخش ثبت‌شده" : "رادار قلمرو خیالی"}{" "}
          <small>LIVE TACTICAL VIEW</small>
        </span>
        <span className="coordinate-tag" dir="ltr">
          GRID 00—1000 · SIMULATION
        </span>
      </div>
      <svg
        ref={svg}
        className="radar-map"
        viewBox="0 0 1000 1000"
        role="group"
        aria-label="نقشه تعاملی ساختگی ایران و آمریکا؛ با کشیدن جابه‌جا کنید"
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
        onWheel={(e) => {
          if (e.ctrlKey) {
            e.preventDefault();
            zoom(-Math.sign(e.deltaY) * 0.1);
          }
        }}
      >
        <defs>
          <pattern
            id={`${id}grid`}
            width="50"
            height="50"
            patternUnits="userSpaceOnUse"
          >
            <path d="M50 0H0V50" fill="none" stroke="#244238" strokeWidth="1" />
          </pattern>
          <radialGradient id={`${id}bg`}>
            <stop stopColor="#102d28" stopOpacity=".6" />
            <stop offset="1" stopColor="#08151c" />
          </radialGradient>
          <linearGradient id={`${id}scan`} x1="0" y1="1" x2="1" y2="0">
            <stop stopColor="#20e3a2" stopOpacity="0" />
            <stop offset="1" stopColor="#20e3a2" stopOpacity=".17" />
          </linearGradient>
          <filter
            id={`${id}glow`}
            x="-100%"
            y="-100%"
            width="300%"
            height="300%"
          >
            <feGaussianBlur stdDeviation="4" />
          </filter>
        </defs>
        <rect width="1000" height="1000" fill={`url(#${id}bg)`} />
        <g
          transform={`translate(${500 + view.x} ${500 + view.y}) scale(${view.z}) translate(-500 -500)`}
        >
          {grid && (
            <rect
              x="-1000"
              y="-1000"
              width="3000"
              height="3000"
              fill={`url(#${id}grid)`}
              opacity=".45"
            />
          )}
          <g className="radar-rings">
            {[125, 250, 375, 480].map((r) => (
              <circle
                key={r}
                cx="500"
                cy="500"
                r={r}
                fill="none"
                stroke="#20e3a2"
                strokeOpacity=".13"
                strokeWidth="1"
              />
            ))}
            <path
              d="M500 0V1000M0 500H1000M145 145L855 855M145 855L855 145"
              stroke="#20e3a2"
              strokeOpacity=".09"
              strokeDasharray="5 8"
            />
          </g>
          <g className="territory">
            <path
              d="M83 183 L170 126 275 145 325 208 406 213 430 325 395 395 447 465 403 533 426 660 365 725 409 822 320 899 210 858 144 906 74 790 109 684 68 583 103 457 61 345Z"
              fill="#20e3a2"
              fillOpacity=".035"
              stroke="#20e3a2"
              strokeOpacity=".3"
              strokeWidth="1.6"
            />
            <path
              d="M592 165L712 122 766 178 881 148 940 257 906 365 951 456 909 539 936 625 882 718 917 817 826 902 745 849 667 893 595 781 623 650 565 538 603 433 560 337Z"
              fill="#38bdf8"
              fillOpacity=".035"
              stroke="#38bdf8"
              strokeOpacity=".28"
              strokeWidth="1.6"
            />
            <text
              x="250"
              y="400"
              textAnchor="middle"
              fill="#20e3a2"
              opacity=".17"
              fontSize="52"
              fontWeight="700"
            >
              ایران
            </text>
            <text
              x="750"
              y="400"
              textAnchor="middle"
              fill="#38bdf8"
              opacity=".17"
              fontSize="52"
              fontWeight="700"
            >
              آمریکا
            </text>
            <text
              x="250"
              y="435"
              textAnchor="middle"
              fill="#20e3a2"
              opacity=".3"
              fontSize="11"
              letterSpacing="4"
            >
              IRAN · SECTOR A
            </text>
            <text
              x="750"
              y="435"
              textAnchor="middle"
              fill="#38bdf8"
              opacity=".3"
              fontSize="11"
              letterSpacing="4"
            >
              USA · SECTOR B
            </text>
          </g>
          <g className="radar-sweep">
            <path
              d="M500 500L500 20A480 480 0 0 1 980 500Z"
              fill={`url(#${id}scan)`}
            />
            <path d="M500 500L980 500" stroke="#20e3a2" strokeOpacity=".5" />
          </g>
          {structures
            .filter((s) => s.active || s.hp === 0)
            .map((s) => {
              const color = statusColor(s),
                type = types.find((t) => t.id === s.type_id);
              return (
                <g
                  data-marker="true"
                  role="button"
                  tabIndex={0}
                  aria-label={`${s.name}؛ سلامت ${fa(s.hp)} از ${fa(s.max_hp)}`}
                  onClick={() => select(s.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      select(s.id);
                    }
                  }}
                  key={s.id}
                  transform={`translate(${s.x} ${s.y})`}
                  className={cn(
                    "map-marker",
                    selectedId === s.id && "selected",
                  )}
                >
                  <title>{s.name}</title>
                  <circle r="27" fill={color} opacity=".05" />
                  <circle r="17" fill={color} opacity=".15" />
                  <circle r="17" fill="none" stroke={color} strokeWidth="1.2" />
                  {type?.code === "defense" ? (
                    <path
                      d="M0 -9L8 -5V2Q8 8 0 12Q-8 8 -8 2V-5Z"
                      fill="none"
                      stroke={color}
                      strokeWidth="2"
                    />
                  ) : type?.code === "airbase" ? (
                    <path
                      d="M0 -9L3 -1L10 4L3 4L2 10L-2 10L-3 4L-10 4L-3 -1Z"
                      fill={color}
                    />
                  ) : type?.code === "radar" ? (
                    <>
                      <circle r="8" fill="none" stroke={color} />
                      <path d="M0 0L7 -7" stroke={color} />
                    </>
                  ) : (
                    <path
                      d="M-7 8V-6H7V8ZM-3 -2H3M-3 2H3M-10 8H10"
                      fill="none"
                      stroke={color}
                      strokeWidth="2"
                    />
                  )}
                  <text y="36" textAnchor="middle" fill="#c4d7de" fontSize="13">
                    {s.name}
                  </text>
                  {s.hp < s.max_hp && (
                    <g>
                      <rect
                        x="-20"
                        y="-28"
                        width="40"
                        height="3"
                        fill="#263442"
                      />
                      <rect
                        x="-20"
                        y="-28"
                        width={(40 * s.hp) / s.max_hp}
                        height="3"
                        fill={color}
                      />
                    </g>
                  )}
                </g>
              );
            })}
          {contacts
            .filter(
              (c) =>
                c.visibility === "identified" &&
                c.x != null &&
                !structures.some((s) => s.id === c.target_id),
            )
            .map((c) => (
              <g
                key={c.id}
                data-marker="true"
                className={cn(
                  "map-marker",
                  "enemy-marker",
                  c.id === selectedId && "selected",
                )}
                role="button"
                tabIndex={0}
                aria-label={`هدف شناسایی‌شده: ${c.label}`}
                onClick={() => select(c.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") select(c.id);
                }}
                transform={`translate(${c.x} ${c.y})`}
              >
                <title>{c.label}</title>
                <path
                  d="M0 -15L15 0L0 15L-15 0Z"
                  fill="#f59e0b"
                  fillOpacity=".1"
                  stroke="#f59e0b"
                  strokeWidth="1.5"
                />
                <circle r="4" fill="#f59e0b" />
                <text y="35" textAnchor="middle" fill="#cfbf9c" fontSize="13">
                  {c.label}
                </text>
              </g>
            ))}
          {missions
            .filter((m) => m.status === "outbound" && m.team_id === teamId)
            .map((m) =>
              fly(
                m.id,
                m.origin_x,
                m.origin_y,
                m.target_x,
                m.target_y,
                m.started_at,
                m.resolves_at,
                "#20e3a2",
              ),
            )}
          {missions
            .filter((m) => m.status === "returning" && m.team_id === teamId)
            .map((m) =>
              fly(
                m.id + "return",
                m.target_x,
                m.target_y,
                m.origin_x,
                m.origin_y,
                m.resolves_at,
                m.ready_at,
                "#38bdf8",
              ),
            )}
          {effects
            .filter(
              (e) =>
                ["mission_resolved", "defense_resolved"].includes(e.kind) &&
                Date.parse(e.created_at) <= now &&
                now - Date.parse(e.created_at) < 6000 &&
                typeof e.payload.target_x === "number",
            )
            .map((e) => (
              <g
                key={e.id}
                transform={`translate(${e.payload.target_x} ${e.payload.target_y})`}
                className="impact"
              >
                <circle
                  r="12"
                  fill={e.payload.defended ? "#38bdf8" : "#f5b544"}
                  opacity=".2"
                />
                <circle
                  className="impact-ring"
                  r="20"
                  fill="none"
                  stroke={e.payload.defended ? "#38bdf8" : "#f5b544"}
                />
                <circle
                  className="impact-ring delayed"
                  r="35"
                  fill="none"
                  stroke={e.payload.defended ? "#38bdf8" : "#f5b544"}
                />
              </g>
            ))}
          {signals
            .filter((s) => !s.jammed && s.x != null && s.target_x != null)
            .map((s) =>
              fly(
                s.id,
                s.x!,
                s.y!,
                s.target_x!,
                s.target_y!,
                s.started_at,
                s.resolves_at,
                "#f59e0b",
              ),
            )}
          {manual && (
            <g>
              {[
                [0, 0],
                [500, 0],
                [0, 500],
                [500, 500],
              ].map(([x, y], i) => (
                <g
                  key={i}
                  data-marker="true"
                  role="button"
                  tabIndex={0}
                  aria-label={`انتخاب ناحیه خیالی ${fa(i + 1)}`}
                  onClick={() => {
                    if (jam) {
                      onManual?.(jam.mission_id, i + 1);
                      setManual(false);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && jam) {
                      onManual?.(jam.mission_id, i + 1);
                      setManual(false);
                    }
                  }}
                >
                  <rect
                    x={x + 10}
                    y={y + 10}
                    width="480"
                    height="480"
                    fill="#f59e0b"
                    fillOpacity=".08"
                    stroke="#f59e0b"
                    strokeDasharray="8 8"
                  />
                  <text
                    x={x + 250}
                    y={y + 250}
                    fill="#f59e0b"
                    fontSize="36"
                    textAnchor="middle"
                  >
                    {fa(i + 1)}
                  </text>
                </g>
              ))}
            </g>
          )}
        </g>
      </svg>
      <div className="radar-controls">
        <Tip text="بزرگ‌نمایی">
          <Button
            variant="ghost"
            aria-label="بزرگ‌نمایی"
            onClick={() => zoom(0.2)}
          >
            <Plus size={17} />
          </Button>
        </Tip>
        <Tip text="کوچک‌نمایی">
          <Button
            variant="ghost"
            aria-label="کوچک‌نمایی"
            onClick={() => zoom(-0.2)}
          >
            <Minus size={17} />
          </Button>
        </Tip>
        <Tip text="بازگشت به مرکز">
          <Button
            variant="ghost"
            aria-label="بازگشت به مرکز"
            onClick={() => setView({ x: 0, y: 0, z: 1 })}
          >
            <LocateFixed size={17} />
          </Button>
        </Tip>
        <Tip text="نمایش شبکه">
          <Button
            variant="ghost"
            aria-label="نمایش شبکه"
            aria-pressed={grid}
            onClick={() => setGrid((v) => !v)}
          >
            <Layers size={17} />
          </Button>
        </Tip>
        <Tip text="تمام صفحه">
          <Button
            variant="ghost"
            aria-label="تمام صفحه"
            onClick={(e) => {
              const radar = e.currentTarget.closest(".radar");
              if (document.fullscreenElement) void document.exitFullscreen();
              else void radar?.requestFullscreen?.();
            }}
          >
            <Maximize2 size={16} />
          </Button>
        </Tip>
      </div>
      <div className="radar-legend">
        <span>
          <i className="dot green" />
          دارایی خودی
        </span>
        <span>
          <i className="dot blue" />
          تیم آمریکا
        </span>
        <span>
          <i className="dot amber" />
          هدف شناسایی‌شده
        </span>
        <span>
          <Navigation size={11} />
          واحد در حرکت
        </span>
      </div>
      <span className="radar-scale" dir="ltr">
        {Math.round(view.z * 100)}% <span>—</span> FICTIONAL GRID
      </span>
      {jam && (
        <div className="jam-banner">
          <ShieldAlert size={20} />
          <div>
            <strong>اختلال نمایشی در رادار</strong>
            <small>
              موقعیت تماس مخفی است؛ دفاع دستی احتمالاتی در دسترس است.
            </small>
          </div>
          {onManual && (
            <Button
              variant="secondary"
              disabled={pending}
              onClick={() => setManual((v) => !v)}
            >
              {manual ? "لغو انتخاب" : "انتخاب ناحیه"}
            </Button>
          )}
        </div>
      )}
      {(selected || contact) && (
        <div className="map-info">
          <Button
            variant="ghost"
            className="close-info"
            aria-label="بستن اطلاعات"
            onClick={() => set({ selectedId: null })}
          >
            <X size={14} />
          </Button>
          <span className="eyebrow">
            <Target size={13} />{" "}
            {selected ? "دارایی ثبت‌شده" : "اطلاعات مجاز هدف"}
          </span>
          <h3>{selected?.name ?? contact?.label}</h3>
          <div className="between">
            <Badge status={selected?.status ?? contact?.visibility} />
            <span>
              {selected
                ? `${fa(selected.hp)} / ${fa(selected.max_hp)}`
                : contact?.health_pct != null
                  ? `سلامت ${fa(contact.health_pct)}٪`
                  : "اطلاعات محدود"}
            </span>
          </div>
          {contact?.visibility === "identified" && onTarget && (
            <Button onClick={() => onTarget(contact)}>
              <Target size={15} />
              تعریف مأموریت
            </Button>
          )}
        </div>
      )}
      <div className="radar-footer">
        <span>
          <Radio size={11} /> {fa(structures.length)} دارایی ·{" "}
          {fa(contacts.filter((c) => c.visibility === "identified").length)} هدف
          مجاز
        </span>
        <span>تمام موقعیت‌ها ساختگی هستند</span>
      </div>
    </div>
  );
}
