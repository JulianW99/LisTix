export type DateRangePreset = "1M" | "3M" | "LTM";

const isoDate = (date: Date) => date.toISOString().slice(0, 10);

export const getDateRange = (preset: DateRangePreset) => {
  const to = new Date(); const from = new Date(to);
  from.setMonth(from.getMonth() - (preset === "1M" ? 1 : preset === "3M" ? 3 : 12));
  return { from: isoDate(from), to: isoDate(to) };
};
