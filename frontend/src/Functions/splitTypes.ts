import type { SplitType } from "../types";

export const splitTypeOptions: Array<{ value: SplitType; label: string; description: string }> = [
  { value: "all_together", label: "Sell all together", description: "The complete ticket group must be purchased in one order." },
  { value: "pairs", label: "Only sell pairs", description: "Buyers can select an even quantity of tickets." },
  { value: "any_no_single", label: "Sell any, but don't leave me with one", description: "Any quantity is allowed unless exactly one ticket would remain." },
  { value: "any", label: "Sell any quantity", description: "Buyers can select any quantity up to the available amount." },
  { value: "single_or_all", label: "Sell one or all together", description: "Buyers can purchase one ticket or the entire group." },
];

export const availableSplitTypes = (quantity: number) => splitTypeOptions.filter((option) => {
  if (option.value === "pairs") return quantity >= 4 && quantity % 2 === 0;
  if (["any_no_single", "single_or_all"].includes(option.value)) return quantity > 2;
  return true;
});

export const splitTypeLabel = (splitType: SplitType) => splitTypeOptions.find((option) => option.value === splitType)?.label ?? "Sell all together";
