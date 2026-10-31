export const formatRp = (n: number | null | undefined) => {
  if (n === null || n === undefined || isNaN(n as number)) return "Rp 0";
  const abs = Math.abs(Math.round(n));
  const parts = abs.toString().split("");
  const rev: string[] = [];
  for (let i = parts.length - 1, c = 0; i >= 0; i--, c++) {
    if (c > 0 && c % 3 === 0) rev.push(".");
    rev.push(parts[i]);
  }
  const s = rev.reverse().join("");
  return `${(n as number) < 0 ? "-" : ""}Rp ${s}`;
};

export const parseRp = (s: string): number => {
  const n = parseInt(String(s).replace(/\D/g, ""), 10);
  return isNaN(n) ? 0 : n;
};

export const formatDate = (iso: string) => {
  try {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return iso;
  }
};

export const todayISO = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
