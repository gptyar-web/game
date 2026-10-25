import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { fa, clock } from "../lib/utils";
import { IR, type GameEvent, type Score } from "../lib/types";
export function ScoreChart({ events }: { events: GameEvent[] }) {
  const points = events
    .filter((e) => e.state?.scores.length)
    .map((e) => ({
      time: clock(e.created_at),
      iran: e.state?.scores.find((s) => s.team_id === IR)?.score ?? 0,
      usa: e.state?.scores.find((s) => s.team_id !== IR)?.score ?? 0,
    }));
  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points}>
          <defs>
            <linearGradient id="chart-green" x1="0" y1="0" x2="0" y2="1">
              <stop stopColor="#20e3a2" stopOpacity={0.25} />
              <stop offset="1" stopColor="#20e3a2" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#213043" vertical={false} />
          <XAxis
            dataKey="time"
            minTickGap={50}
            tick={{ fill: "#8293a7", fontSize: 10 }}
            axisLine={false}
          />
          <YAxis
            tickFormatter={fa}
            tick={{ fill: "#8293a7", fontSize: 11 }}
            width={50}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "#142338",
              border: "1px solid #2b3d52",
              borderRadius: 8,
            }}
          />
          <Area
            name="ایران"
            type="stepAfter"
            dataKey="iran"
            stroke="#20e3a2"
            fill="url(#chart-green)"
            strokeWidth={2}
          />
          <Area
            name="آمریکا"
            type="stepAfter"
            dataKey="usa"
            stroke="#38bdf8"
            fill="transparent"
            strokeWidth={2}
          />
          <Legend />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
export function ComparisonChart({ scores }: { scores: Score[] }) {
  const points = scores.map((s) => ({
    team: s.team_id === IR ? "ایران" : "آمریکا",
    missions: s.successful_missions,
    defenses: s.successful_defenses,
    repairs: s.repairs,
  }));
  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={points}>
          <CartesianGrid vertical={false} stroke="#213043" />
          <XAxis dataKey="team" tick={{ fill: "#8293a7" }} />
          <YAxis
            tickFormatter={fa}
            allowDecimals={false}
            tick={{ fill: "#8293a7", fontSize: 11 }}
          />
          <Tooltip
            contentStyle={{
              background: "#142338",
              border: "1px solid #2b3d52",
              borderRadius: 8,
            }}
          />
          <Bar
            name="مأموریت موفق"
            dataKey="missions"
            fill="#20e3a2"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            name="دفاع موفق"
            dataKey="defenses"
            fill="#38bdf8"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            name="تعمیر"
            dataKey="repairs"
            fill="#f59e0b"
            radius={[4, 4, 0, 0]}
          />
          <Legend />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
export function ResourceChart({ events }: { events: GameEvent[] }) {
  const points = events
    .filter((e) => e.state?.resources?.length)
    .map((e) => ({
      time: clock(e.created_at),
      credits: e.state!.resources![0]?.credits ?? 0,
      energy: e.state!.resources![0]?.energy ?? 0,
      materials: e.state!.resources![0]?.materials ?? 0,
    }));
  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points}>
          <CartesianGrid stroke="#213043" vertical={false} />
          <XAxis
            dataKey="time"
            tick={{ fill: "#8293a7", fontSize: 10 }}
            minTickGap={60}
          />
          <YAxis
            tickFormatter={fa}
            tick={{ fill: "#8293a7", fontSize: 11 }}
            width={55}
          />
          <Tooltip
            contentStyle={{
              background: "#142338",
              border: "1px solid #2b3d52",
            }}
          />
          <Area
            type="stepAfter"
            dataKey="credits"
            name="اعتبار"
            stroke="#f59e0b"
            fill="#f59e0b"
            fillOpacity={0.05}
          />
          <Area
            type="stepAfter"
            dataKey="energy"
            name="انرژی"
            stroke="#38bdf8"
            fill="transparent"
          />
          <Area
            type="stepAfter"
            dataKey="materials"
            name="مواد"
            stroke="#20e3a2"
            fill="transparent"
          />
          <Legend />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
export function HealthChart({ events }: { events: GameEvent[] }) {
  const points = events
    .filter((e) => e.state)
    .map((e) => ({
      time: clock(e.created_at),
      health: e.state!.structures.length
        ? Math.round(
            (e.state!.structures.reduce((v, s) => v + s.hp, 0) /
              e.state!.structures.reduce((v, s) => v + s.max_hp, 0)) *
              100,
          )
        : 0,
    }));
  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points}>
          <CartesianGrid stroke="#213043" vertical={false} />
          <XAxis
            dataKey="time"
            tick={{ fill: "#8293a7", fontSize: 10 }}
            minTickGap={60}
          />
          <YAxis
            domain={[0, 100]}
            tickFormatter={fa}
            tick={{ fill: "#8293a7", fontSize: 11 }}
          />
          <Tooltip
            contentStyle={{
              background: "#142338",
              border: "1px solid #2b3d52",
            }}
          />
          <Area
            type="stepAfter"
            dataKey="health"
            name="درصد سلامت"
            stroke="#20e3a2"
            fill="#20e3a2"
            fillOpacity={0.1}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
