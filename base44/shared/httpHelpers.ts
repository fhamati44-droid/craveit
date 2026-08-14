// Shared HTTP response helpers for backend functions.
export function json(data, status = 200) {
  return Response.json(data, { status });
}

export function errRes(e) {
  const status = e?.status || 500;
  return json({ error: e?.message || 'server_error' }, status);
}