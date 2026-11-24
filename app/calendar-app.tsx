"use client";
import { useState, useEffect, useRef } from "react";
import { authClient } from "@/lib/auth-client";
import {
  iso,
  date,
  label,
  monthStart,
  subjectColor as color,
} from "@/lib/calendar";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Clock,
  GraduationCap,
  Users,
  Copy,
  Pencil,
  Trash2,
  Check,
  LogOut,
  ChevronDown,
  BookOpen,
  LayoutGrid,
  List,
} from "lucide-react";
type Exam = {
  id: string;
  title: string;
  subject: string;
  type: string;
  date: string;
  time: string;
  description: string;
  location: string;
  author: string;
};
type Group = { id: string; name: string; code: string; role: string };
type Data = {
  user: { signedIn: boolean; role: string } | null;
  classes: Group[];
  events: Exam[];
  error?: string;
};
const empty = (day: string): Exam => ({
  id: "",
  title: "",
  subject: "",
  type: "Examen",
  date: day,
  time: "09:00",
  description: "",
  location: "",
  author: "Profesor",
});
export default function CalendarApp() {
  const [month, setMonth] = useState(monthStart()),
    [events, setEvents] = useState<Exam[]>([]),
    [subject, setSubject] = useState("Todas"),
    [view, setView] = useState("Mes");
  const [groups, setGroups] = useState<Group[]>([]),
    [classId, setClassId] = useState(""),
    [signedIn, setSignedIn] = useState(false),
    [accountRole, setAccountRole] = useState("student");
  const [modal, setModal] = useState(""),
    [draft, setDraft] = useState<Exam>(empty(iso(new Date()))),
    [selected, setSelected] = useState(iso(new Date())),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [notice, setNotice] = useState(""),
    [refreshError, setRefreshError] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null),
    loadRequest = useRef<AbortController | null>(null),
    noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null),
    revision = useRef(0);
  const group = groups.find((g) => g.id === classId),
    teacher = group?.role === "teacher";
  const today = iso(new Date());
  const availableSubjects = Array.from(
    new Set(events.map((e) => e.subject)),
  ).sort((a, b) => a.localeCompare(b, "es"));
  const filtered = events
    .filter(
      (e) =>
        e.type === "Examen" && (subject === "Todas" || e.subject === subject),
    )
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const visible = filtered.filter((e) =>
    e.date.startsWith(iso(month).slice(0, 7)),
  );
  const nextExam = [...events]
    .filter(
      (e) =>
        e.date + "T" + e.time >=
        today + "T" + new Date().toTimeString().slice(0, 5),
    )
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))[0];
  const start = (month.getDay() + 6) % 7,
    total = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = Array.from(
    { length: Math.ceil((start + total) / 7) * 7 },
    (_, i) => new Date(month.getFullYear(), month.getMonth(), i - start + 1),
  );
  async function load(id: string, signal?: AbortSignal) {
    const r = await fetch(
      "/api/classroom" + (id ? "?classId=" + encodeURIComponent(id) : ""),
      { signal, cache: "no-store" },
    );
    const data = (await r.json()) as Data;
    if (r.status === 401) {
      window.location.assign("/login");
      throw new Error("La sesión ha caducado.");
    }
    if (!r.ok)
      throw new Error(data.error || "No se pudo cargar el calendario.");
    return data;
  }
  async function switchClass(id: string) {
    loadRequest.current?.abort();
    const controller = new AbortController();
    loadRequest.current = controller;
    revision.current++;
    setClassId(id);
    setSubject("Todas");
    setError("");
    setRefreshError(false);
    setEvents([]);
    if (!id) {
      setLoading(false);
      return;
    }
    sessionStorage.setItem("selected-class", id);
    setLoading(true);
    setMonth(monthStart());
    try {
      const d = await load(id, controller.signal);
      if (!controller.signal.aborted) {
        setEvents(d.events);
        setGroups(d.classes);
        setSignedIn(!!d.user);
        setAccountRole(d.user?.role || "student");
      }
    } catch (e: unknown) {
      if (!controller.signal.aborted)
        setError(
          e instanceof Error ? e.message : "No se pudo cargar la clase.",
        );
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }
  useEffect(() => {
    const controller = new AbortController();
    load("", controller.signal)
      .then((d) => {
        if (controller.signal.aborted) return;
        setSignedIn(!!d.user);
        setAccountRole(d.user?.role || "student");
        setGroups(d.classes);
        const saved = sessionStorage.getItem("selected-class");
        const first = d.classes.find((c) => c.id === saved) || d.classes[0];
        if (first) void switchClass(first.id);
        else setLoading(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setError(
            "No se pudo conectar. Recarga la página para volver a intentarlo.",
          );
          setLoading(false);
        }
      });
    return () => {
      controller.abort();
      loadRequest.current?.abort();
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    };
  }, []);
  useEffect(() => {
    if (!classId || busy || loading) return;
    const controller = new AbortController();
    let pending = false;
    const timer = setInterval(async () => {
      if (pending || document.hidden) return;
      pending = true;
      const version = revision.current;
      try {
        const d = await load(classId, controller.signal);
        if (!controller.signal.aborted && version === revision.current) {
          setEvents(d.events);
          setRefreshError(false);
        }
      } catch {
        if (!controller.signal.aborted && version === revision.current)
          setRefreshError(true);
      } finally {
        pending = false;
      }
    }, 30000);
    return () => {
      clearInterval(timer);
      controller.abort();
    };
  }, [classId, busy, loading]);
  useEffect(() => {
    if (modal) dialog.current?.showModal();
    else dialog.current?.close();
  }, [modal]);
  const open = (name: string) => {
    setError("");
    setModal(name);
  };
  const close = () => {
    if (!busy) setModal("");
  };
  const inform = (message: string) => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    setNotice(message);
    noticeTimer.current = setTimeout(() => setNotice(""), 3500);
  };
  const newExam = (day = today) => {
    setDraft(empty(day));
    open("edit");
  };
  const details = (e: Exam) => {
    setDraft(e);
    open("detail");
  };
  async function post(body: unknown) {
    revision.current++;
    const r = await fetch("/api/classroom", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = (await r.json()) as { id: string; error?: string };
    if (r.status === 401) {
      window.location.assign("/login");
      throw new Error("La sesión ha caducado.");
    }
    if (!r.ok)
      throw new Error(d.error || "No se pudo guardar. Inténtalo de nuevo.");
    return d;
  }
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const examSubject = String(form.get("subject") || "").trim();
    const exam = {
      ...draft,
      subject: examSubject,
      title:
        String(form.get("title") || "").trim() || `Examen de ${examSubject}`,
      date: String(form.get("date") || ""),
      time: String(form.get("time") || ""),
    };
    try {
      const saved = await post({ action: "save", classId, event: exam });
      setEvents((previous) => [
        ...previous.filter((item) => item.id !== exam.id),
        { ...exam, id: saved.id },
      ]);
      setSubject("Todas");
      setMonth(
        new Date(date(exam.date).getFullYear(), date(exam.date).getMonth(), 1),
      );
      setModal("");
      inform("Examen guardado");
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : "No se pudo completar la operación.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    setBusy(true);
    setError("");
    try {
      await post({ action: "delete", classId, id: draft.id });
      setEvents((previous) => previous.filter((item) => item.id !== draft.id));
      setSubject("Todas");
      setModal("");
      inform("Examen eliminado");
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : "No se pudo completar la operación.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="app">
      <a className="skip-link" href="#calendar-main">
        Ir al calendario
      </a>
      <header className="header">
        <a href="/" className="brand">
          <span>
            <CalendarDays size={22} />
          </span>
          Calendario<span className="brand-suffix">de exámenes</span>
        </a>
        <button
          className="class-button"
          disabled={loading || busy}
          onClick={() => open("class")}
        >
          <Users size={17} />
          {group?.name || "Mis clases"}
          <ChevronDown size={15} />
        </button>
        <button
          className="logout"
          onClick={async () => {
            setBusy(true);
            try {
              const { error } = await authClient.signOut();
              if (error) throw error;
              sessionStorage.removeItem("selected-class");
              window.location.assign("/login");
            } catch {
              setError("No se pudo cerrar la sesión. Inténtalo de nuevo.");
            } finally {
              setBusy(false);
            }
          }}
          disabled={busy}
          aria-label="Cerrar sesión"
        >
          <LogOut size={17} />
          <span>Cerrar sesión</span>
        </button>
      </header>
      <main id="calendar-main">
        <div className="heading">
          <div>
            <span className="eyebrow">
              {accountRole === "teacher"
                ? "ESPACIO DOCENTE"
                : "TU ESPACIO DE CLASE"}
            </span>
            <h1>
              Todo a su tiempo<span className="title-dot">.</span>
            </h1>
            <p>
              {group ? group.name + " · " : ""}Tus exámenes, con perspectiva.
            </p>
          </div>
          {teacher && !loading && (
            <button className="primary" onClick={() => newExam()}>
              <Plus size={18} />
              Añadir examen
            </button>
          )}
        </div>

        {!modal && error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {!loading && !groups.length && (
          <div className="onboarding">
            <GraduationCap size={28} />
            <h2>
              {accountRole === "teacher"
                ? "Crea tu primera clase"
                : "Únete a tu clase"}
            </h2>
            <p>
              {accountRole === "teacher"
                ? "Cada clase tendrá su propio código para los alumnos."
                : "Escribe el código que te ha dado tu profesor."}
            </p>
            <button
              className="primary"
              onClick={() =>
                open(accountRole === "teacher" ? "create" : "join")
              }
            >
              {accountRole === "teacher" ? "Crear clase" : "Introducir código"}
            </button>
          </div>
        )}
        {group && !loading && (
          <div className="overview">
            <div className="overview-item">
              <span className="overview-icon">
                <CalendarDays size={22} />
              </span>
              <div>
                <span>Este mes</span>
                <strong>
                  {visible.length}{" "}
                  <small>{visible.length === 1 ? "examen" : "exámenes"}</small>
                </strong>
              </div>
            </div>
            <div className="overview-item">
              <span className="overview-icon">
                <BookOpen size={22} />
              </span>
              <div>
                <span>Asignaturas en clase</span>
                <strong>
                  {availableSubjects.length}{" "}
                  <small>
                    {availableSubjects.length === 1
                      ? "asignatura"
                      : "asignaturas"}
                  </small>
                </strong>
              </div>
            </div>
            <div className="overview-item next-exam">
              <span className="overview-icon">
                <Clock size={22} />
              </span>
              <div>
                <span>Próximo examen</span>
                {nextExam ? (
                  <button onClick={() => details(nextExam)}>
                    <strong>{nextExam.subject}</strong>
                    <small>
                      {label(nextExam.date)} · {nextExam.time}
                    </small>
                  </button>
                ) : (
                  <strong className="no-upcoming">Sin fechas pendientes</strong>
                )}
              </div>
            </div>
          </div>
        )}
        <section className="calendar" aria-label="Calendario de exámenes">
          <div className="toolbar">
            <div className="month-title">
              <h2>
                {month
                  .toLocaleDateString("es-ES", {
                    month: "long",
                    year: "numeric",
                  })
                  .replace(" de ", " ")}
              </h2>
              <div className="navigation">
                <button
                  aria-label="Mes anterior"
                  onClick={() =>
                    setMonth(
                      new Date(month.getFullYear(), month.getMonth() - 1, 1),
                    )
                  }
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  aria-label="Mes siguiente"
                  onClick={() =>
                    setMonth(
                      new Date(month.getFullYear(), month.getMonth() + 1, 1),
                    )
                  }
                >
                  <ChevronRight size={20} />
                </button>
              </div>
              <button
                className="today"
                onClick={() =>
                  setMonth(
                    new Date(
                      date(today).getFullYear(),
                      date(today).getMonth(),
                      1,
                    ),
                  )
                }
              >
                Hoy
              </button>
            </div>
            <div className="controls">
              <select
                aria-label="Filtrar por asignatura"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              >
                <option value="Todas">Todas las asignaturas</option>
                {availableSubjects.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <div className="view-switch">
                {["Mes", "Lista"].map((v) => (
                  <button
                    key={v}
                    aria-pressed={view === v}
                    onClick={() => setView(v)}
                  >
                    {v === "Mes" ? (
                      <LayoutGrid size={16} />
                    ) : (
                      <List size={16} />
                    )}
                    <span>{v}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          {loading ? (
            <div className="empty loading-state" role="status">
              <span className="spinner" />
              Preparando tu calendario…
            </div>
          ) : view === "Mes" ? (
            <div
              className="calendar-scroll"
              tabIndex={0}
              aria-label="Calendario mensual; desplaza horizontalmente para ver todos los días"
            >
              <div className="calendar-grid">
                <div className="weekdays">
                  {[
                    "Lunes",
                    "Martes",
                    "Miércoles",
                    "Jueves",
                    "Viernes",
                    "Sábado",
                    "Domingo",
                  ].map((d) => (
                    <span key={d}>
                      <span className="weekday-full">{d}</span>
                      <span className="weekday-short" aria-hidden="true">
                        {d.slice(0, 3)}
                      </span>
                    </span>
                  ))}
                </div>
                <div className="days">
                  {cells.map((d) => {
                    const day = iso(d),
                      outside = d.getMonth() !== month.getMonth(),
                      exams = filtered.filter((e) => e.date === day);
                    return (
                      <div
                        key={day}
                        className={
                          "day " +
                          (outside ? "outside " : "") +
                          (day === today ? "current" : "")
                        }
                      >
                        <button
                          className="day-number"
                          aria-current={day === today ? "date" : undefined}
                          aria-label={
                            label(day) + ", " + exams.length + " exámenes"
                          }
                          onClick={() => {
                            setSelected(day);
                            open("day");
                          }}
                        >
                          {d.getDate()}
                        </button>
                        {exams.slice(0, 2).map((e) => (
                          <button
                            key={e.id}
                            className={"exam " + color(e.subject)}
                            title={`${e.subject}: ${e.title}, ${e.time}`}
                            onClick={() => details(e)}
                          >
                            <strong>{e.subject}</strong>
                            <span>
                              {e.time} · {e.title}
                            </span>
                          </button>
                        ))}
                        {exams.length > 2 && (
                          <button
                            className="more"
                            onClick={() => {
                              setSelected(day);
                              open("day");
                            }}
                          >
                            +{exams.length - 2} más
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="list">
              {visible.length ? (
                visible.map((e) => (
                  <button
                    key={e.id}
                    className="exam-row"
                    onClick={() => details(e)}
                  >
                    <span className="row-date">
                      <strong>{date(e.date).getDate()}</strong>
                      {date(e.date).toLocaleDateString("es-ES", {
                        weekday: "short",
                      })}
                    </span>
                    <span className={"dot " + color(e.subject)} />
                    <span className="row-info">
                      <strong>{e.subject}</strong>
                      <span>{e.title}</span>
                    </span>
                    <span className="row-time">
                      <Clock size={15} />
                      {e.time}
                    </span>
                    <ChevronRight size={17} />
                  </button>
                ))
              ) : (
                <div className="empty">
                  <CalendarDays size={28} />
                  <h3>No hay exámenes este mes</h3>
                  <p>
                    {subject === "Todas"
                      ? "Los exámenes publicados aparecerán aquí."
                      : "Prueba con otra asignatura."}
                  </p>
                </div>
              )}
            </div>
          )}
          <div className="calendar-bottom">
            <span>
              {visible.length} {visible.length === 1 ? "examen" : "exámenes"}{" "}
              este mes
            </span>
            <span>
              {refreshError
                ? "Sin conexión · Reintentando"
                : teacher
                  ? "Profesor · Puedes editar"
                  : "Alumno · Solo consulta"}
            </span>
          </div>
        </section>
        <p className="hint">
          Pulsa una fecha o un examen para ver los detalles.
        </p>
      </main>
      <dialog
        ref={dialog}
        aria-label="Gestión del calendario"
        onCancel={(e) => {
          e.preventDefault();
          close();
        }}
        onClick={(e) => {
          if (e.target === dialog.current) close();
        }}
      >
        <div className="modal">
          <button
            className="close"
            disabled={busy}
            aria-label="Cerrar"
            onClick={close}
          >
            <X size={21} />
          </button>
          {modal === "detail" && (
            <>
              <span className={"badge " + color(draft.subject)}>
                {draft.subject}
              </span>
              <h2>{draft.title}</h2>
              <div className="exam-details">
                <span>
                  <CalendarDays size={18} />
                  {label(draft.date)}
                </span>
                <span>
                  <Clock size={18} />
                  {draft.time}
                </span>
              </div>
              {draft.location && <p>Aula: {draft.location}</p>}
              {draft.description && (
                <p className="notes">{draft.description}</p>
              )}
              {teacher && (
                <div className="actions">
                  <button className="danger" onClick={() => open("delete")}>
                    <Trash2 size={16} />
                    Eliminar
                  </button>
                  <button className="primary" onClick={() => open("edit")}>
                    <Pencil size={16} />
                    Editar
                  </button>
                </div>
              )}
            </>
          )}
          {modal === "day" && (
            <>
              <h2>{label(selected)}</h2>
              {filtered
                .filter((e) => e.date === selected)
                .map((e) => (
                  <button
                    key={e.id}
                    className="simple-row"
                    onClick={() => details(e)}
                  >
                    <strong>{e.subject}</strong>
                    <span>{e.time}</span>
                  </button>
                ))}
              {!filtered.some((e) => e.date === selected) && (
                <p>No hay exámenes este día.</p>
              )}
              {teacher && (
                <button
                  className="primary full spaced"
                  onClick={() => newExam(selected)}
                >
                  <Plus size={17} />
                  Añadir examen
                </button>
              )}
            </>
          )}
          {modal === "edit" && (
            <>
              <h2>{draft.id ? "Editar examen" : "Añadir examen"}</h2>
              <form onSubmit={save}>
                <fieldset disabled={busy}>
                  <label>
                    Asignatura
                    <input
                      required
                      maxLength={60}
                      name="subject"
                      defaultValue={draft.subject}
                      placeholder="Ej. Programación"
                    />
                  </label>
                  <div className="form-grid">
                    <label>
                      Fecha
                      <input
                        required
                        type="date"
                        name="date"
                        defaultValue={draft.date}
                      />
                    </label>
                    <label>
                      Hora
                      <input
                        required
                        type="time"
                        name="time"
                        defaultValue={draft.time}
                      />
                    </label>
                  </div>
                  <label>
                    Tema <span className="optional">(opcional)</span>
                    <input
                      maxLength={100}
                      placeholder="Ej. Ecuaciones de segundo grado"
                      name="title"
                      defaultValue={draft.title}
                    />
                  </label>
                  <button className="primary full" disabled={busy}>
                    {busy ? "Guardando…" : "Guardar examen"}
                  </button>
                </fieldset>
              </form>
            </>
          )}
          {modal === "delete" && (
            <>
              <h2>¿Eliminar examen?</h2>
              <p>
                {draft.subject} · {label(draft.date)}
              </p>
              <div className="actions">
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() => open("detail")}
                >
                  Cancelar
                </button>
                <button className="danger" disabled={busy} onClick={remove}>
                  {busy ? "Eliminando…" : "Eliminar"}
                </button>
              </div>
            </>
          )}
          {modal === "class" && (
            <>
              <span className="eyebrow">UN ESPACIO PARA CADA GRUPO</span>
              <h2>Mis clases</h2>
              {groups.map((g) => (
                <button
                  key={g.id}
                  className={
                    "simple-row " + (g.id === classId ? "selected-class" : "")
                  }
                  aria-current={g.id === classId ? "true" : undefined}
                  onClick={() => {
                    void switchClass(g.id);
                    close();
                  }}
                >
                  <strong>{g.name}</strong>
                  <span>{g.role === "teacher" ? "Profesor" : "Alumno"}</span>
                </button>
              ))}
              {group && teacher && (
                <div className="class-code">
                  <p>Código para unirse como alumno</p>
                  <div>
                    <strong>{group.code}</strong>
                    <button
                      aria-label="Copiar código"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(group.code);
                          inform("Código copiado");
                        } catch {
                          inform("Selecciona el código para copiarlo");
                        }
                      }}
                    >
                      <Copy size={17} />
                    </button>
                  </div>
                  <p className="small">
                    Comparte este código con tus alumnos. Entrarán desde la
                    pestaña «Alumno».
                  </p>
                </div>
              )}
              {signedIn ? (
                <div className="class-actions">
                  <button className="secondary" onClick={() => open("join")}>
                    Unirme con código
                  </button>
                  {accountRole === "teacher" && (
                    <button className="primary" onClick={() => open("create")}>
                      Crear clase
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <p>
                    Inicia sesión para crear tu clase o entrar con un código.
                  </p>
                  <a className="primary full spaced" href="/login">
                    Iniciar sesión
                  </a>
                </>
              )}
            </>
          )}
          {(modal === "create" || modal === "join") && (
            <>
              <h2>
                {modal === "create" ? "Crear clase" : "Unirme a una clase"}
              </h2>
              <p>
                {modal === "create"
                  ? "Podrás añadir y editar los exámenes de esta clase."
                  : "Introduce el código que te ha dado tu profesor."}
              </p>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setBusy(true);
                  setError("");
                  const data = new FormData(e.currentTarget);
                  try {
                    const d = await post({
                      action: modal,
                      name: data.get("value"),
                      code: data.get("value"),
                    });
                    await switchClass(d.id);
                    setModal("");
                  } catch (e: unknown) {
                    setError(
                      e instanceof Error
                        ? e.message
                        : "No se pudo completar la operación.",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <label>
                  {modal === "create" ? "Nombre de la clase" : "Código"}
                  <input
                    name="value"
                    disabled={busy}
                    required
                    minLength={modal === "join" ? 12 : 1}
                    pattern={modal === "join" ? "[a-fA-F0-9]{12}" : undefined}
                    maxLength={modal === "create" ? 70 : 12}
                    placeholder={
                      modal === "create"
                        ? "Ej. 2º Bachillerato B"
                        : "Código de 12 caracteres"
                    }
                  />
                </label>
                <button className="primary full" disabled={busy}>
                  {busy
                    ? "Conectando…"
                    : modal === "create"
                      ? "Crear clase"
                      : "Entrar"}
                </button>
              </form>
            </>
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </div>
      </dialog>
      {notice && (
        <div className="toast" role="status">
          <Check size={17} />
          {notice}
        </div>
      )}
    </div>
  );
}
