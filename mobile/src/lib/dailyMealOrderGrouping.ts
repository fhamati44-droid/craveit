export interface DailyOrderDetails {
  order_id: string;
  delivery_method: "delivery" | "pickup";
  delivery_address: string;
  customer_notes: string;
  line_index: number;
  line_count: number;
  service_date?: string;
}

type ReservationLine = { id: number | string; selected_options: Record<string, unknown> };

type CartLine = {
  menu_id: number;
  service_date?: string;
  quantity: number;
  selected_options: Record<string, unknown>;
  unit_price: number;
};

type DailyOrderInput = {
  lines: CartLine[];
  customer_name: string;
  phone: string;
  delivery_method: "delivery" | "pickup";
  delivery_address?: string;
  customer_notes?: string;
};

export function buildDailyOrderRows(input: DailyOrderInput, orderId: string) {
  const customerName = input.customer_name.trim();
  const lineCount = input.lines.length;
  return input.lines.map((line, index) => ({
    menu_id: line.menu_id,
    customer_name: customerName,
    phone: input.phone,
    quantity: line.quantity,
    unit_price: line.unit_price,
    status: "new" as const,
    selected_options: {
      ...line.selected_options,
      __order: {
        order_id: orderId,
        delivery_method: input.delivery_method,
        delivery_address: input.delivery_address?.trim() || "",
        customer_notes: input.customer_notes?.trim() || "",
        line_index: index + 1,
        line_count: lineCount,
        ...(line.service_date ? { service_date: line.service_date } : {}),
      } satisfies DailyOrderDetails,
    },
  }));
}

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
