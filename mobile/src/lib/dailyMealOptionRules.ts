export type DailyCategory = "soup" | "main" | "addition" | "salad";
export type SharedDailyCategory = Exclude<DailyCategory, "main">;
export const DAILY_CATEGORIES: DailyCategory[] = ["soup", "main", "addition", "salad"];
export const SHARED_DAILY_CATEGORIES: SharedDailyCategory[] = ["soup", "addition", "salad"];

type OptionRow = { id: number; menu_id: number | null; category: DailyCategory };
type MenuOverride = { menu_id: number; category: SharedDailyCategory; option_ids: number[] };

export function getVisibleDailyOptions<T extends OptionRow>(options: T[], menuId: number | null, category: DailyCategory, override?: MenuOverride) {
  const categoryOptions = options.filter((option) =>
    option.category === category && (category === "main" ? option.menu_id === menuId : option.menu_id === null),
  );
  if (category === "main" || !override) return categoryOptions;
  const allowedIds = new Set(override.option_ids.map(Number));
  return categoryOptions.filter((option) => allowedIds.has(option.id));
}

export function getVisibleDailyCategories<T extends OptionRow>(options: T[], menuId: number | null, overrides: MenuOverride[]) {
  return DAILY_CATEGORIES.filter((category) => category === "main" || getVisibleDailyOptions(
    options,
    menuId,
    category,
    overrides.find((override) => override.menu_id === menuId && override.category === category),
  ).length > 0);
}
