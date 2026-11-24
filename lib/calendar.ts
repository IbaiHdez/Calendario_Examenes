/** Calendar dates are local civil dates, never UTC timestamps. */
export const iso = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export const date = (value: string) => new Date(`${value}T12:00:00`);
export const label = (value: string) =>
  date(value).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
export const monthStart = (value = new Date()) =>
  new Date(value.getFullYear(), value.getMonth(), 1);
const colors = ["violet", "pink", "amber", "blue", "green", "teal"];
/** A subject keeps its color when exams or filters change. */
export function subjectColor(subject: string) {
  const hash = Array.from(subject.normalize("NFC").trim().toLowerCase()).reduce(
    (sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0,
    0,
  );
  return colors[hash % colors.length];
}
