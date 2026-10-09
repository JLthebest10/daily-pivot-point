import { db, currentUserId } from "@/lib/db";

export type BagItem = {
  id: string;
  name: string;
  category: string | null;
  icon: string | null;
  is_fixed: boolean;
  active: boolean;
  order_index: number;
};
export type BagList = { id: string; title: string; date: string; note: string | null; created_at: string };
export type BagListItem = {
  id: string;
  list_id: string;
  source_item_id: string | null;
  name: string;
  category: string | null;
  icon: string | null;
  checked: boolean;
  order_index: number;
};

export type Progress = { done: number; total: number; left: number; pct: number; ready: boolean };

export function bagProgress(items: Pick<BagListItem, "checked">[]): Progress {
  const total = items.length;
  const done = items.filter((i) => i.checked).length;
  return { done, total, left: total - done, pct: total ? (done / total) * 100 : 0, ready: total > 0 && done === total };
}

/** Fixed + active templates, copied into a new list (snapshot, never linked by reference). */
export function templatesForNewList(items: BagItem[]) {
  return items
    .filter((i) => i.is_fixed && i.active)
    .sort((a, b) => a.order_index - b.order_index)
    .map((i) => ({ source_item_id: i.id, name: i.name, category: i.category, icon: i.icon }));
}

/** Upcoming = today..today+7; future = later; past = before today. Next = earliest upcoming/future not ready. */
export function groupLists(lists: BagList[], today: string, weekEnd: string, ready: (id: string) => boolean) {
  const sorted = [...lists].sort((a, b) => a.date.localeCompare(b.date) || a.created_at.localeCompare(b.created_at));
  const upcoming = sorted.filter((l) => l.date >= today && l.date <= weekEnd);
  const future = sorted.filter((l) => l.date > weekEnd);
  const past = sorted.filter((l) => l.date < today).reverse();
  const next = [...upcoming, ...future].find((l) => !ready(l.id)) ?? upcoming[0] ?? null;
  return { next, upcoming, future, past };
}

type NewRow = { source_item_id?: string | null; name: string; category?: string | null; icon?: string | null };

export async function createBagList(input: { title: string; date: string; note: string | null; items: NewRow[] }) {
  const user_id = await currentUserId();
  const { data: list, error } = await db
    .from("bag_lists")
    .insert({ user_id, title: input.title, date: input.date, note: input.note })
    .select()
    .single();
  if (error) throw error;
  if (input.items.length) {
    const rows = input.items.map((it, i) => ({
      user_id,
      list_id: list.id,
      source_item_id: it.source_item_id ?? null,
      name: it.name,
      category: it.category ?? null,
      icon: it.icon ?? null,
      checked: false,
      order_index: i,
    }));
    const { error: e2 } = await db.from("bag_list_items").insert(rows);
    if (e2) throw e2;
  }
  return list as BagList;
}
