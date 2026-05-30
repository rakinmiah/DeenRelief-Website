export function formatMonthYear(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

export function formatFullDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function durationBare(startedOn: string): string {
  const from = new Date(startedOn);
  const to = new Date();
  let m =
    (to.getFullYear() - from.getFullYear()) * 12 +
    (to.getMonth() - from.getMonth());
  if (to.getDate() < from.getDate()) m -= 1;
  m = Math.max(0, m);
  if (m < 1) return "less than a month";
  if (m < 12) return `${m} month${m === 1 ? "" : "s"}`;
  const years = Math.floor(m / 12);
  const rem = m % 12;
  const y = `${years} year${years === 1 ? "" : "s"}`;
  return rem ? `${y}, ${rem} month${rem === 1 ? "" : "s"}` : y;
}
