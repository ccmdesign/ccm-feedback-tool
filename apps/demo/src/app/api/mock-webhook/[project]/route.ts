/**
 * Mock webhook endpoint for E2E + local dev.
 *
 * Logs the incoming body + headers to the server console and returns 200.
 * Pass `?fail=1` to force a 500 response for retry-path testing.
 *
 * Guarded against production: returns 404 when `NODE_ENV === 'production'`.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, _context: unknown): Promise<Response> {
  if (process.env.NODE_ENV === "production") {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  const url = new URL(request.url);
  const shouldFail = url.searchParams.get("fail") === "1";
  const body = await request.text();
  const headers: Record<string, string> = {};
  for (const [k, v] of request.headers) {
    if (k.toLowerCase().startsWith("x-ccm") || k === "content-type") headers[k] = v;
  }
  // Structured prefix — E2E tests scrape the server logs for this line.
  // eslint-disable-next-line no-console
  console.log("[mock-webhook]", JSON.stringify({ url: request.url, headers, body }));
  if (shouldFail) {
    return Response.json({ error: "forced failure" }, { status: 500 });
  }
  return Response.json({ ok: true });
}
