export const IR = "10000000-0000-4000-8000-000000000001";
export const US = "10000000-0000-4000-8000-000000000002";
export type Role = "admin" | "player" | "spectator";
export interface Profile {
  id: string;
  username: string;
  display_name: string;
  role: Role;
  disabled: boolean;
  must_change_password: boolean;
}
export interface Match {
  id: string;
  name: string;
  description: string;
  status: string;
  is_test: boolean;
  created_at: string;
  started_at: string | null;
  ends_at: string | null;
  paused_at: string | null;
  result: {
    winner: string | null;
    scores: Score[];
    mission_count: number;
  } | null;
  revision: number;
}
export interface Team {
  id: string;
  code: string;
  name: string;
  color: string;
}
export interface StructureType {
  id: string;
  code: string;
  name: string;
  icon: string;
}
export interface Structure {
  id: string;
  match_id: string;
  team_id: string;
  type_id: string;
  name: string;
  description: string;
  x: number;
  y: number;
  hp: number;
  max_hp: number;
  level: number;
  status: string;
  intel: string;
  active: boolean;
  repair_cost: number;
  repair_seconds: number;
  created_at: string;
  updated_at: string;
}
export interface Contact {
  id: string;
  target_id: string;
  visibility: "identified" | "unknown";
  label: string;
  kind: string | null;
  x: number | null;
  y: number | null;
  health_pct: number | null;
}
export interface Aircraft {
  id: string;
  team_id: string;
  name: string;
  kind: "standard" | "advanced" | "stealth";
  level: number;
  hp: number;
  energy: number;
  cost: number;
  missions_remaining: number;
  preparation_seconds: number;
  animation_speed: number;
  status: string;
  home_id: string;
  x: number;
  y: number;
  ready_at: string | null;
}
export interface Defense {
  id: string;
  team_id: string;
  structure_id: string;
  name: string;
  level: number;
  defense_score: number;
  charges: number;
  cooldown_seconds: number;
  ready_at: string | null;
  active: boolean;
}
export interface Mission {
  id: string;
  team_id: string;
  aircraft_id: string;
  target_id: string;
  status: string;
  started_at: string;
  resolves_at: string;
  ready_at: string;
  jam_until: string | null;
  origin_x: number;
  origin_y: number;
  target_x: number;
  target_y: number;
  result: { damage: number; defended: boolean; aircraft_lost: boolean } | null;
}
export interface Signal {
  id: string;
  mission_id: string;
  label: string;
  jammed: boolean;
  x: number | null;
  y: number | null;
  target_x: number | null;
  target_y: number | null;
  started_at: string;
  resolves_at: string;
  jam_until: string | null;
}
export interface Repair {
  id: string;
  team_id: string;
  structure_id: string | null;
  aircraft_id: string | null;
  started_at: string;
  completes_at: string;
  status: string;
}
export interface Resources {
  id: string;
  team_id: string;
  credits: number;
  energy: number;
  materials: number;
  logistics: number;
  research: number;
  mission_tokens: number;
}
export interface Transaction {
  id: string;
  team_id: string;
  reason: string;
  delta: Partial<Record<keyof Resources, number>>;
  created_at: string;
}
export interface Score {
  id: string;
  team_id: string;
  score: number;
  successful_missions: number;
  successful_defenses: number;
  losses: number;
  damage: number;
  repairs: number;
}
export interface GameEvent {
  id: string;
  seq: number;
  kind: string;
  title: string;
  payload: Record<string, unknown>;
  state: {
    structures: Structure[];
    contacts: Contact[];
    signals: Signal[];
    missions?: Mission[];
    resources?: Resources[];
    scores: Score[];
  } | null;
  created_at: string;
}
export interface Notice {
  id: string;
  kind: string;
  title: string;
  body: string;
  created_at: string;
  read: boolean;
}
export interface Character {
  id: string;
  team_id: string;
  first_name: string;
  last_name: string;
  title: string;
  description: string;
  residence_id: string;
  status: string;
}
export interface Member {
  id: string;
  user_id: string;
  team_id: string | null;
  role: string;
}
export interface Audit {
  id: string;
  actor_id: string;
  action: string;
  payload: Record<string, unknown>;
  created_at: string;
}
export type Rules = Record<string, number | boolean>;
export interface Snapshot {
  server_time: string;
  profile: Profile;
  match: Match;
  rules: Rules;
  team_id: string | null;
  membership: Member | null;
  teams: Team[];
  types: StructureType[];
  structures: Structure[];
  contacts: Contact[];
  aircraft: Aircraft[];
  defenses: Defense[];
  missions: Mission[];
  signals: Signal[];
  repairs: Repair[];
  resources: Resources[];
  transactions: Transaction[];
  scores: Score[];
  characters: Character[];
  notifications: Notice[];
  events: GameEvent[];
  members: Member[];
  profiles: Profile[];
  audit: Audit[];
}
export interface Lobby {
  profile: Profile;
  matches: Match[];
}
export interface Command {
  match_id?: string;
  action: string;
  payload: Record<string, unknown>;
  request_id: string;
}
