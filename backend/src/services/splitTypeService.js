export const splitTypes = {
  all_together: "Sell all together",
  pairs: "Only sell pairs",
  any_no_single: "Sell any, but don't leave me with one",
  any: "Sell any quantity",
  single_or_all: "Sell a single ticket or all together",
};

export const allowedQuantitiesForSplit = (quantity, splitType) => {
  const total = Number(quantity);
  if (!Number.isInteger(total) || total < 1) return [];
  if (total === 1 || splitType === "all_together") return [total];
  if (splitType === "pairs") return Array.from({ length: total / 2 }, (_, index) => (index + 1) * 2);
  if (splitType === "any_no_single") return Array.from({ length: total }, (_, index) => index + 1).filter((value) => total - value !== 1);
  if (splitType === "single_or_all") return [1, total];
  if (splitType === "any") return Array.from({ length: total }, (_, index) => index + 1);
  return [];
};

export const validateSplitType = (quantity, splitType) => {
  const total = Number(quantity);
  const selected = total === 1 ? "all_together" : String(splitType || "");
  if (!Object.hasOwn(splitTypes, selected)) return { ok: false, message: "Select a valid split type." };
  if (selected === "pairs" && (total < 4 || total % 2 !== 0)) return { ok: false, message: "Only sell pairs requires an even quantity of at least 4." };
  if ((selected === "any_no_single" || selected === "single_or_all") && total <= 2) return { ok: false, message: "This split type requires more than 2 tickets." };
  return { ok: true, value: selected, allowedQuantities: allowedQuantitiesForSplit(total, selected) };
};
