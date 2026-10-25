import { useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  MapPin,
  PenLine,
  Building2,
  Trash2,
  ArrowUpDown,
  ChevronRight,
  ChevronLeft,
  Wrench,
  Info,
} from "lucide-react";
import { useGame } from "../lib/data";
import { useUI } from "../stores/ui";
import { IR, type Structure } from "../lib/types";
import {
  Button,
  Panel,
  Modal,
  Badge,
  Health,
  Empty,
  useToast,
} from "../components/ui/core";
import { ConfirmAction } from "../components/Actions";
import { PageHeading } from "./Dashboard";
import { datetime, fa, label, remaining } from "../lib/utils";
export default function Assets() {
  const { data, now, canAct, pending, command } = useGame(),
    nav = useNavigate(),
    toast = useToast();
  const [search, setSearch] = useState(""),
    [type, setType] = useState(""),
    [status, setStatus] = useState(""),
    [country, setCountry] = useState(""),
    [sort, setSort] = useState("name"),
    [page, setPage] = useState(0),
    [edit, setEdit] = useState<Structure | null | undefined>(undefined),
    [detail, setDetail] = useState<Structure | null>(null);
  const admin = data.profile.role === "admin",
    commander = data.membership?.role === "commander";
  const filtered = useMemo(
    () =>
      data.structures
        .filter(
          (s) =>
            (!search ||
              s.name.includes(search) ||
              s.description.includes(search)) &&
            (!type || s.type_id === type) &&
            (!status || s.status === status) &&
            (!country || s.team_id === country),
        )
        .sort((a, b) =>
          sort === "hp"
            ? a.hp / a.max_hp - b.hp / b.max_hp
            : sort === "updated"
              ? Date.parse(b.updated_at) - Date.parse(a.updated_at)
              : a.name.localeCompare(b.name, "fa"),
        ),
    [data.structures, search, type, status, country, sort],
  );
  const rows = filtered.slice(page * 8, page * 8 + 8),
    pages = Math.max(1, Math.ceil(filtered.length / 8));
  const repairDesc = `هزینه: ${fa(Number(data.rules.repair_credits))} اعتبار و ${fa(Number(data.rules.repair_materials))} مواد · زمان: ${fa(Number(data.rules.repair_seconds))} ثانیه`;
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget),
      p = Object.fromEntries(form);
    const payload = {
      ...p,
      x: Number(p.x),
      y: Number(p.y),
      hp: Number(p.hp),
      level: Number(p.level),
      fictional: form.has("fictional"),
      active: form.has("active"),
    };
    try {
      if (admin)
        await command("admin_structure", { ...payload, id: edit?.id ?? null });
      else if (edit)
        await command("update_structure", {
          id: edit.id,
          name: p.name,
          description: p.description,
        });
      else await command("construct", payload);
      setEdit(undefined);
      toast("اطلاعات سازه ثبت شد.");
    } catch {
      /* reported */
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="ASSET REGISTRY"
        title="سازه‌ها و دارایی‌ها"
        description="دارایی‌های مجاز را جست‌وجو کنید، وضعیت سلامت را ببینید و تعمیرات را مدیریت کنید."
      >
        <Button
          disabled={
            admin
              ? !["draft", "ready", "paused"].includes(data.match.status)
              : !canAct
          }
          onClick={() => setEdit(null)}
        >
          <Plus size={17} />
          ثبت سازهٔ خیالی
        </Button>
      </PageHeading>
      <Panel>
        <div className="table-toolbar">
          <div className="search-field">
            <Search size={17} />
            <input
              aria-label="جست‌وجوی سازه‌ها"
              placeholder="جست‌وجوی نام یا توضیحات…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
            />
          </div>
          <select
            aria-label="فیلتر نوع"
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(0);
            }}
          >
            <option value="">همهٔ انواع</option>
            {data.types.map((t) => (
              <option value={t.id} key={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <select
            aria-label="فیلتر وضعیت"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(0);
            }}
          >
            <option value="">همهٔ وضعیت‌ها</option>
            {[
              "healthy",
              "damaged",
              "needs_repair",
              "repairing",
              "inactive",
              "destroyed",
            ].map((s) => (
              <option key={s} value={s}>
                {label(s)}
              </option>
            ))}
          </select>
          {admin && (
            <select
              aria-label="فیلتر کشور"
              value={country}
              onChange={(e) => {
                setCountry(e.target.value);
                setPage(0);
              }}
            >
              <option value="">هر دو تیم</option>
              {data.teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
          <select
            aria-label="مرتب‌سازی"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="name">مرتب‌سازی: نام</option>
            <option value="hp">کمترین سلامت</option>
            <option value="updated">آخرین تغییر</option>
          </select>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>سازه / نوع</th>
                <th>کشور</th>
                <th>سطح</th>
                <th>
                  سلامت <ArrowUpDown size={12} />
                </th>
                <th>وضعیت</th>
                <th>تعمیر / هزینه</th>
                <th>آخرین تغییر</th>
                <th>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => {
                const repair = data.repairs.find(
                  (r) => r.structure_id === s.id && r.status === "active",
                );
                return (
                  <tr key={s.id}>
                    <td>
                      <button
                        className="table-name"
                        onClick={() => setDetail(s)}
                      >
                        <span className="table-asset-icon">
                          <Building2 size={17} />
                        </span>
                        <span>
                          <strong>{s.name}</strong>
                          <small>
                            {data.types.find((t) => t.id === s.type_id)?.name}
                          </small>
                        </span>
                      </button>
                    </td>
                    <td>{s.team_id === IR ? "🇮🇷 ایران" : "🇺🇸 آمریکا"}</td>
                    <td>{fa(s.level)}</td>
                    <td className="health-cell">
                      <span>
                        {fa(s.hp)} / {fa(s.max_hp)}
                      </span>
                      <Health value={s.hp} max={s.max_hp} />
                    </td>
                    <td>
                      <Badge status={s.status} />
                    </td>
                    <td>
                      {repair ? (
                        <span className="amber-text">
                          {remaining(repair.completes_at, now)}
                        </span>
                      ) : (
                        <span>
                          {fa(Number(data.rules.repair_credits))} اعتبار
                          <br />
                          <small>
                            {fa(Number(data.rules.repair_materials))} مواد
                          </small>
                        </span>
                      )}
                    </td>
                    <td className="date-cell">{datetime(s.updated_at)}</td>
                    <td>
                      <div className="table-actions">
                        <Button
                          variant="ghost"
                          aria-label={`نمایش ${s.name} روی نقشه`}
                          onClick={() => {
                            useUI.getState().set({ selectedId: s.id });
                            nav("/radar");
                          }}
                        >
                          <MapPin size={15} />
                        </Button>
                        <Button
                          variant="ghost"
                          aria-label={`جزئیات ${s.name}`}
                          onClick={() => setDetail(s)}
                        >
                          <Info size={15} />
                        </Button>
                        {((commander && s.team_id === data.team_id) ||
                          admin) && (
                          <Button
                            variant="ghost"
                            aria-label={`ویرایش ${s.name}`}
                            disabled={
                              admin
                                ? !["draft", "ready", "paused"].includes(
                                    data.match.status,
                                  )
                                : !canAct
                            }
                            onClick={() => setEdit(s)}
                          >
                            <PenLine size={15} />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!filtered.length && (
          <Empty
            title="سازه‌ای پیدا نشد"
            description="فیلترها را تغییر دهید یا یک سازهٔ خیالی ثبت کنید."
          />
        )}
        <div className="pagination">
          <span>
            {fa(filtered.length)} سازه · صفحهٔ {fa(page + 1)} از {fa(pages)}
          </span>
          <div>
            <Button
              variant="ghost"
              aria-label="صفحه قبل"
              disabled={page === 0}
              onClick={() => setPage((x) => x - 1)}
            >
              <ChevronRight size={16} />
            </Button>
            <Button
              variant="ghost"
              aria-label="صفحه بعد"
              disabled={page >= pages - 1}
              onClick={() => setPage((x) => x + 1)}
            >
              <ChevronLeft size={16} />
            </Button>
          </div>
        </div>
      </Panel>
      <Modal
        open={edit !== undefined}
        onOpenChange={(v) => {
          if (!v) setEdit(undefined);
        }}
        title={edit ? "ویرایش سازهٔ خیالی" : "ثبت سازهٔ خیالی"}
        description={
          admin
            ? "تنظیمات مدیریتی فقط در وضعیت آماده یا توقف قابل تغییرند."
            : `هزینهٔ ساخت: ${fa(Number(data.rules.build_credits))} اعتبار، ${fa(Number(data.rules.build_materials))} مواد و ۱ لجستیک.`
        }
      >
        {edit !== undefined && (
          <form onSubmit={save} key={edit?.id ?? "new"}>
            <label>
              نام ساختگی
              <input
                name="name"
                maxLength={80}
                defaultValue={edit?.name}
                required
              />
            </label>
            <label>
              توضیح ساختگی
              <textarea
                name="description"
                maxLength={240}
                defaultValue={edit?.description}
              />
            </label>
            {(!edit || admin) && (
              <>
                <div className="form-grid">
                  <label>
                    نوع سازه
                    <select name="type_id" defaultValue={edit?.type_id}>
                      {data.types.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  {admin && (
                    <label>
                      تیم مالک
                      <select
                        name="team_id"
                        defaultValue={edit?.team_id ?? data.team_id ?? IR}
                      >
                        {data.teams.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>
                <div className="form-grid">
                  <label>
                    مختصات X ساختگی
                    <input
                      name="x"
                      type="number"
                      min={60}
                      max={940}
                      defaultValue={
                        edit?.x ?? (data.team_id === IR ? 200 : 700)
                      }
                      required
                    />
                  </label>
                  <label>
                    مختصات Y ساختگی
                    <input
                      name="y"
                      type="number"
                      min={60}
                      max={940}
                      defaultValue={edit?.y ?? 500}
                      required
                    />
                  </label>
                </div>
                {admin && (
                  <div className="form-grid">
                    <label>
                      سلامت (از ۱۰۰)
                      <input
                        name="hp"
                        type="number"
                        min={0}
                        max={100}
                        defaultValue={edit?.hp ?? 100}
                        required
                      />
                    </label>
                    <label>
                      سطح
                      <input
                        name="level"
                        type="number"
                        min={1}
                        max={10}
                        defaultValue={edit?.level ?? 1}
                        required
                      />
                    </label>
                    <label>
                      دید تیم مقابل
                      <select
                        name="intel"
                        defaultValue={edit?.intel ?? "unknown"}
                      >
                        <option value="identified">شناسایی‌شده</option>
                        <option value="unknown">نامشخص</option>
                        <option value="hidden">مخفی</option>
                      </select>
                    </label>
                    <label className="check-label">
                      <input
                        type="checkbox"
                        name="active"
                        defaultChecked={edit?.active ?? true}
                      />
                      فعال باشد
                    </label>
                  </div>
                )}
                <p className="muted">
                  قلمرو ایران: X بین ۶۰ تا ۴۴۰ · قلمرو آمریکا: X بین ۵۶۰ تا ۹۴۰
                  · Y بین ۶۰ تا ۹۴۰.
                </p>
                <label className="check-label">
                  <input type="checkbox" name="fictional" required />
                  تأیید می‌کنم همهٔ اطلاعات ساختگی‌اند و هیچ نشانی یا دادهٔ
                  واقعی ثبت نمی‌کنم.
                </label>
              </>
            )}
            <Button disabled={pending}>ثبت اطلاعات</Button>
          </form>
        )}
      </Modal>
      <Modal
        open={!!detail}
        onOpenChange={(v) => {
          if (!v) setDetail(null);
        }}
        title={detail?.name ?? "جزئیات سازه"}
      >
        {detail && (
          <>
            <div className="detail-grid">
              <span>
                نوع
                <strong>
                  {data.types.find((t) => t.id === detail.type_id)?.name}
                </strong>
              </span>
              <span>
                سلامت
                <strong>
                  {fa(detail.hp)} / {fa(detail.max_hp)}
                </strong>
              </span>
              <span>
                شناسایی رقیب<strong>{label(detail.intel)}</strong>
              </span>
              <span>
                زمان ساخت<strong>{datetime(detail.created_at)}</strong>
              </span>
            </div>
            <p className="muted">
              {detail.description || "توضیحی ثبت نشده است."}
            </p>
            <div className="dialog-actions">
              <ConfirmAction
                action="repair"
                payload={{ structure_id: detail.id }}
                title="آغاز تعمیر سازه"
                description={repairDesc}
                disabled={
                  !canAct ||
                  detail.team_id !== data.team_id ||
                  detail.hp === detail.max_hp ||
                  detail.status === "repairing"
                }
              >
                <Wrench size={16} />
                شروع تعمیر
              </ConfirmAction>
              <ConfirmAction
                action="upgrade"
                payload={{ id: detail.id }}
                title="ارتقای سازه"
                description={`هزینه ${fa(Number(data.rules.upgrade_credits))} اعتبار و ${fa(Number(data.rules.upgrade_research))} پژوهش`}
                disabled={
                  !canAct ||
                  detail.team_id !== data.team_id ||
                  detail.level >= 10
                }
              >
                ارتقا
              </ConfirmAction>
              {commander && detail.team_id === data.team_id && (
                <ConfirmAction
                  action="delete_structure"
                  payload={{ id: detail.id }}
                  title="خارج‌کردن سازه از بازی"
                  description="سازه غیرفعال می‌شود و تاریخچهٔ آن حفظ خواهد شد."
                  variant="danger"
                  disabled={!canAct}
                >
                  <Trash2 size={15} />
                  حذف از بازی
                </ConfirmAction>
              )}
            </div>
            <h3 className="subheading">تاریخچهٔ تعمیر این سازه</h3>
            {data.repairs
              .filter((r) => r.structure_id === detail.id)
              .map((r) => (
                <div className="history-line" key={r.id}>
                  <Badge status={r.status} />
                  <span>{datetime(r.started_at)}</span>
                </div>
              ))}
            {!data.repairs.some((r) => r.structure_id === detail.id) && (
              <p className="muted">تعمیر ثبت نشده است.</p>
            )}
          </>
        )}
      </Modal>
    </>
  );
}
