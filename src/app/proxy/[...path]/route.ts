import { type NextRequest } from "next/server";

// Backend API base — read server-side only, so the HTTP URL never ships in the
// client bundle. The browser calls this same-origin /proxy/* handler (HTTPS),
// and Next.js forwards to the HTTP backend here, avoiding mixed-content blocks.
const TARGET =
  process.env.API_PROXY_TARGET || "http://dev.ajmedia.io:8000/api";

// Always run on the server at request time (never statically cached).
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function handler(
  req: NextRequest,
  ctx: { params: Promise<{ path?: string[] }> }
): Promise<Response> {
  const { path = [] } = await ctx.params;
  const search = req.nextUrl.search; // includes leading "?" when present
  const url = `${TARGET}/${path.join("/")}${search}`;

  // Forward only the headers the backend needs (auth + content negotiation).
  const headers = new Headers();
  const auth = req.headers.get("authorization");
  if (auth) headers.set("authorization", auth);
  const contentType = req.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  headers.set("accept", req.headers.get("accept") || "application/json");

  const method = req.method.toUpperCase();
  const hasBody = method !== "GET" && method !== "HEAD";
  const rawBody = hasBody ? await req.arrayBuffer() : undefined;

  let backendRes: Response;
  try {
    backendRes = await fetch(url, {
      method,
      headers,
      body: rawBody && rawBody.byteLength > 0 ? Buffer.from(rawBody) : undefined,
      cache: "no-store",
    });
  } catch {
    return Response.json(
      { success: false, message: "Upstream API request failed" },
      { status: 502 }
    );
  }

  const outHeaders = new Headers();
  const resContentType = backendRes.headers.get("content-type");
  if (resContentType) outHeaders.set("content-type", resContentType);

  const outBody = await backendRes.arrayBuffer();
  return new Response(outBody, {
    status: backendRes.status,
    headers: outHeaders,
  });
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
