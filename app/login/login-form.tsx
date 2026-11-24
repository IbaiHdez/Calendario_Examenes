"use client";

import { useState } from "react";
import {
  CalendarDays,
  GraduationCap,
  Users,
  LockKeyhole,
  Eye,
  EyeOff,
  KeyRound,
  Check,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";

export default function LoginForm({ configured }: { configured: boolean }) {
  const [mode, setMode] = useState<"teacher" | "student">("teacher");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!configured || busy) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      if (mode === "student") {
        const { data: session, error: sessionError } =
          await authClient.getSession();
        if (sessionError)
          throw new Error(
            "No se pudo comprobar tu sesión. Inténtalo de nuevo.",
          );
        // Entering through the student form must never retain teacher privileges.
        if (session && !session.user.isAnonymous) {
          const { error } = await authClient.signOut();
          if (error) throw new Error("No se pudo cambiar al acceso de alumno.");
        }
        if (!session || !session.user.isAnonymous) {
          const { error } = await authClient.signIn.anonymous();
          if (error)
            throw new Error(
              "No se pudo iniciar el acceso de alumno. Inténtalo más tarde.",
            );
        }
        const response = await fetch("/api/classroom", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "join",
            code: String(form.get("code") || "").trim(),
          }),
        });
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error || "No se pudo entrar en la clase.");
        sessionStorage.setItem("selected-class", data.id);
      } else {
        const username = String(form.get("username") || "")
          .trim()
          .toLowerCase();
        const { error: loginError } = await authClient.signIn.email({
          email:
            username === "profesores"
              ? "profesores@calendario.local"
              : username,
          password: String(form.get("password") || ""),
        });
        if (loginError)
          throw new Error(
            loginError.status >= 500
              ? "No se pudo conectar al servicio de acceso. Inténtalo más tarde."
              : loginError.status === 429
                ? "Demasiados intentos. Espera un minuto."
                : "Usuario o contraseña incorrectos.",
          );
        const response = await fetch("/api/classroom");
        const data = await response.json();
        if (!response.ok)
          throw new Error(
            data.error || "No se pudo comprobar el acceso. Inténtalo de nuevo.",
          );
        if (data.user?.role !== "teacher") {
          await authClient.signOut();
          throw new Error("Esta cuenta no está autorizada como profesor.");
        }
        sessionStorage.removeItem("selected-class");
      }
      window.location.assign("/");
    } catch (error: unknown) {
      setError(
        error instanceof Error
          ? error.message
          : "No se pudo acceder. Inténtalo de nuevo.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-page">
      <a href="/login" className="brand login-brand">
        <span>
          <CalendarDays size={23} />
        </span>
        Calendario<span className="brand-suffix">de exámenes</span>
      </a>
      <div className="login-layout">
        <section className="login-intro" aria-labelledby="intro-title">
          <span className="eyebrow">
            <span className="mini-line" /> TU CLASE, EN SINTONÍA
          </span>
          <h1 id="intro-title">
            Todo a tiempo.
            <br />
            <span>Todo más claro.</span>
          </h1>
          <p>
            Un lugar para organizar los exámenes.
            <br />Y tener la cabeza en lo que importa.
          </p>
          <div className="glass-illustration" aria-hidden="true">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="floating-tile tile-back">
              <GraduationCap size={32} />
              <span>Tu clase</span>
            </div>
            <div className="floating-tile tile-calendar">
              <div className="illustration-top">
                <CalendarDays size={22} />
                <span>Todo organizado</span>
                <Check size={18} />
              </div>
              <div className="mini-calendar">
                {Array.from({ length: 21 }, (_, i) => (
                  <i
                    key={i}
                    className={[3, 9, 16].includes(i) ? "marked" : ""}
                  />
                ))}
              </div>
            </div>
            <div className="floating-tile tile-front">
              <span className="check-icon">
                <Check size={18} />
              </span>
              Una fecha. Cero dudas.
            </div>
          </div>
          <div className="intro-caption">
            <LockKeyhole size={15} /> Profesores con cuenta · Alumnos con código
          </div>
        </section>
        <section className="login-card" aria-labelledby="login-title">
          <span className="card-symbol">
            {mode === "teacher" ? (
              <GraduationCap size={26} />
            ) : (
              <KeyRound size={25} />
            )}
          </span>
          <span className="eyebrow">BIENVENIDO A TU CALENDARIO</span>
          <h2 id="login-title">Entra en tu clase</h2>
          <p>
            {mode === "teacher"
              ? "Organiza las fechas. Comparte la tranquilidad."
              : "Tus próximos exámenes empiezan aquí."}
          </p>
          <div className="login-tabs" aria-label="Tipo de acceso">
            <button
              disabled={busy}
              aria-pressed={mode === "teacher"}
              onClick={() => {
                setMode("teacher");
                setError("");
                setShowPassword(false);
              }}
            >
              <GraduationCap size={18} />
              Profesor
            </button>
            <button
              disabled={busy}
              aria-pressed={mode === "student"}
              onClick={() => {
                setMode("student");
                setError("");
                setShowPassword(false);
              }}
            >
              <Users size={18} />
              Alumno
            </button>
          </div>
          <form onSubmit={submit} key={mode} aria-busy={busy}>
            <fieldset disabled={busy || !configured}>
              {mode === "teacher" ? (
                <>
                  <label>
                    Usuario
                    <input
                      name="username"
                      required
                      autoComplete="username"
                      autoCapitalize="none"
                      spellCheck={false}
                      placeholder="profesores"
                    />
                  </label>
                  <label htmlFor="password">Contraseña</label>
                  <div className="password-field">
                    <input
                      id="password"
                      name="password"
                      required
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="Tu contraseña"
                    />
                    <button
                      type="button"
                      aria-label={
                        showPassword
                          ? "Ocultar contraseña"
                          : "Mostrar contraseña"
                      }
                      aria-pressed={showPassword}
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                    </button>
                  </div>
                </>
              ) : (
                <label>
                  Código de clase
                  <input
                    className="code-input"
                    name="code"
                    required
                    minLength={12}
                    maxLength={12}
                    pattern="[a-fA-F0-9]{12}"
                    placeholder="Ej. A1B2C3D4E5F6"
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                  />
                </label>
              )}
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              <button
                className="primary full login-submit"
                disabled={busy || !configured}
              >
                {busy ? (
                  <>
                    <span className="spinner" />
                    Conectando…
                  </>
                ) : mode === "teacher" ? (
                  "Entrar como profesor"
                ) : (
                  "Entrar en mi clase"
                )}
              </button>
            </fieldset>
          </form>
          <p className="login-footnote">
            <LockKeyhole size={14} />
            {mode === "teacher"
              ? "Acceso compartido para el equipo docente."
              : "Solo necesitas el código que te dé tu profesor."}
          </p>
          {!configured && (
            <div className="setup-notice" role="status">
              <strong>Acceso todavía no disponible</strong>
              <p>
                El administrador está terminando de configurar el calendario.
              </p>
            </div>
          )}
        </section>
      </div>
      <footer className="login-footer">
        <span>Menos mensajes. Más organización.</span>
        <span>Calendario de exámenes</span>
      </footer>
    </main>
  );
}
