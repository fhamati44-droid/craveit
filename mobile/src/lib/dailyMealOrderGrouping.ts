export interface DailyOrderDetails {
  order_id: string;
  delivery_method: "delivery" | "pickup";
  delivery_address: string;
  customer_notes: string;
  line_index: number;
  line_count: number;
}

type ReservationLine = { id: number | string; selected_options: Record<string, unknown> };

export function getDailyOrderDetails(row: ReservationLine): DailyOrderDetails | null {
  const value = row.selected_options?.__order;
  if (!value || typeof value !== "object" || typeof (value as DailyOrderDetails).order_id !== "string") return null;
  return value as DailyOrderDetails;
}

export function groupDailyReservations<T extends ReservationLine>(rows: T[]) {
  const groups = new Map<string, { id: string; rows: T[]; order: DailyOrderDetails | null }>();
  for (const row of rows) {
    const order = getDailyOrderDetails(row);
    const id = order?.order_id || `reservation-${row.id}`;
    const group = groups.get(id) || { id, rows: [], order };
    group.rows.push(row);
    groups.set(id, group);
  }
  return [...groups.values()];
}
