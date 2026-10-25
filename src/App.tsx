import { lazy, Suspense, useState, Component, type ReactNode } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Crosshair, LogOut, ArrowLeft, RefreshCw } from "lucide-react";
import { AuthPage, PasswordPage } from "./features/Auth";
import { useAuth, useLobby, GameProvider } from "./lib/data";
import { client } from "./lib/supabase";
import { useUI } from "./stores/ui";
import type { Lobby, Snapshot } from "./lib/types";
import { Button, Panel, Loading, Empty, Badge } from "./components/ui/core";
import { MatchCreator } from "./components/Actions";
import Shell from "./components/Shell";
import { datetime, errorMessage } from "./lib/utils";
const Dashboard = lazy(() => import("./features/Dashboard")),
  Assets = lazy(() => import("./features/Assets")),
  Admin = lazy(() => import("./features/Admin")),
  Settings = lazy(() => import("./features/Settings"));
const Aircraft = lazy(() =>
    import("./features/Operations").then((m) => ({ default: m.AircraftPage })),
  ),
  Defense = lazy(() =>
    import("./features/Operations").then((m) => ({ default: m.DefensePage })),
  ),
  Missions = lazy(() =>
    import("./features/Operations").then((m) => ({ default: m.MissionsPage })),
  ),
  Repairs = lazy(() =>
    import("./features/Operations").then((m) => ({ default: m.RepairsPage })),
  );
const Resources = lazy(() =>
    import("./features/Records").then((m) => ({ default: m.ResourcesPage })),
  ),
  Notifications = lazy(() =>
    import("./features/Records").then((m) => ({
      default: m.NotificationsPage,
    })),
  ),
  History = lazy(() =>
    import("./features/Records").then((m) => ({ default: m.HistoryPage })),
  ),
  Results = lazy(() =>
    import("./features/Records").then((m) => ({ default: m.ResultsPage })),
  );
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="center-page">
        <Panel className="error-panel">
          <h1>نمایش این صفحه با مشکل مواجه شد</h1>
          <p>داده‌های ثبت‌شده در سرور حفظ شده‌اند.</p>
          <Button onClick={() => window.location.reload()}>
            بارگذاری دوباره
          </Button>
        </Panel>
      </div>
    ) : (
      this.props.children
    );
  }
}
function MatchLobby({
  lobby,
  select,
}: {
  lobby: Lobby;
  select: (id: string) => void;
}) {
  return (
    <div className="lobby-page">
      <header>
        <a href="#/" className="brand">
          <span className="brand-icon">
            <Crosshair />
          </span>
          <strong>
            GAME<span>STRATEGIC SIMULATOR</span>
          </strong>
        </a>
        <Button variant="ghost" onClick={() => void client().auth.signOut()}>
          <LogOut size={16} />
          خروج
        </Button>
      </header>
      <div className="page-heading">
        <div>
          <span className="eyebrow">SELECT YOUR MATCH</span>
          <h1>انتخاب فضای رقابت</h1>
          <p>{lobby.profile.display_name}، مسابقهٔ خود را انتخاب کنید.</p>
        </div>
        {lobby.profile.role === "admin" && <MatchCreator onCreated={select} />}
      </div>
      <div className="match-grid">
        {lobby.matches.map((m) => (
          <Panel key={m.id} className="match-card">
            <div className="between">
              <Badge status={m.status} />
              <span className="muted">
                {m.is_test ? "آزمایشی" : "مسابقهٔ اصلی"}
              </span>
            </div>
            <h2>{m.name}</h2>
            <p>{m.description || "رقابت دو تیم در قلمروهای کاملاً خیالی"}</p>
            <small>{datetime(m.created_at)}</small>
            <Button variant="secondary" onClick={() => select(m.id)}>
              ورود به مسابقه
              <ArrowLeft size={16} />
            </Button>
          </Panel>
        ))}
      </div>
      {!lobby.matches.length && (
        <Panel>
          <Empty
            title="هنوز مسابقه‌ای برای شما تعیین نشده است"
            description={
              lobby.profile.role === "admin"
                ? "یک مسابقه ایجاد و کاربران را به تیم‌ها اختصاص دهید."
                : "مدیر می‌تواند شما را به یک مسابقه و تیم اضافه کند."
            }
          />
        </Panel>
      )}
    </div>
  );
}
function Workspace({
  matchId,
  onSwitch,
}: {
  matchId: string;
  onSwitch: () => void;
}) {
  const { session } = useAuth(),
    ui = useUI();
  const query = useQuery({
    queryKey: ["snapshot", session?.user.id, matchId, ui.viewTeam],
    queryFn: async () => {
      const { data, error } = await client().rpc("game_snapshot", {
        p_match_id: matchId,
        p_view_team: ui.viewTeam,
      });
      if (error) throw error;
      return data as Snapshot;
    },
    refetchInterval: (q) =>
      q.state.data?.match.status === "running" ? 5000 : 15000,
    refetchOnWindowFocus: true,
    staleTime: 1000,
    retry: 1,
  });
  if (query.isPending) return <Loading />;
  if (query.isError)
    return (
      <div className="center-page">
        <Panel className="error-panel">
          <h2>همگام‌سازی مسابقه ممکن نشد</h2>
          <p>{errorMessage(query.error)}</p>
          <Button onClick={() => void query.refetch()}>
            <RefreshCw size={16} />
            تلاش مجدد
          </Button>
          <Button variant="ghost" onClick={onSwitch}>
            انتخاب مسابقه
          </Button>
        </Panel>
      </div>
    );
  return (
    <GameProvider
      key={`${matchId}:${ui.viewTeam}`}
      data={query.data}
      refetch={() => void query.refetch()}
    >
      <Shell onSwitch={onSwitch}>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/radar" element={<Dashboard radarOnly />} />
            <Route path="/structures" element={<Assets />} />
            <Route path="/aircraft" element={<Aircraft />} />
            <Route path="/defense" element={<Defense />} />
            <Route path="/missions" element={<Missions />} />
            <Route path="/repairs" element={<Repairs />} />
            <Route path="/resources" element={<Resources />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/history" element={<History />} />
            <Route path="/results" element={<Results />} />
            <Route
              path="/admin"
              element={
                query.data.profile.role === "admin" ? (
                  <Admin />
                ) : (
                  <Navigate to="/" />
                )
              }
            />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Suspense>
      </Shell>
    </GameProvider>
  );
}
function SignedIn() {
  const lobby = useLobby(),
    auth = useAuth(),
    ui = useUI(),
    [choosing, setChoosing] = useState(false);
  if (lobby.isPending) return <Loading />;
  if (lobby.isError)
    return (
      <div className="center-page">
        <Panel className="error-panel">
          <h2>حساب بازی در دسترس نیست</h2>
          <p>{errorMessage(lobby.error)}</p>
          <Button onClick={() => void lobby.refetch()}>تلاش مجدد</Button>
          <Button variant="ghost" onClick={() => void client().auth.signOut()}>
            خروج
          </Button>
        </Panel>
      </div>
    );
  if (lobby.data.profile.must_change_password || auth.recovering)
    return <PasswordPage />;
  const match = lobby.data.matches.find((m) => m.id === ui.matchId);
  const select = (id: string) => {
    ui.set({ matchId: id, selectedId: null, viewTeam: null });
    setChoosing(false);
  };
  if (!match || choosing)
    return <MatchLobby lobby={lobby.data} select={select} />;
  return (
    <Workspace
      matchId={match.id}
      onSwitch={() => {
        setChoosing(true);
        void lobby.refetch();
      }}
    />
  );
}
export default function App() {
  const auth = useAuth();
  if (auth.loading) return <Loading />;
  return auth.session ? <SignedIn /> : <AuthPage />;
}
