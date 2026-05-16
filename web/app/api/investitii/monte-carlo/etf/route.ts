import config from "@payload-config";
import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import { type SimulariUserLike } from "@/lib/simulari-access";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

function accessError(user: SimulariUserLike) {
  if (!user?.id) return NextResponse.json({ error: "login_required" }, { status: 401 });
  if (user.role !== "super_admin" && user.accountStatus && user.accountStatus !== "active") {
    return NextResponse.json({ error: "account_not_active" }, { status: 403 });
  }
  return null;
}

export async function POST(req: NextRequest) {
  const payload = await getPayload({ config });
  const auth = await payload.auth({ headers: req.headers });
  const user = auth.user as SimulariUserLike;
  const denied = accessError(user);
  if (denied) return denied;

  const body = await req.text();
  const upstream = await fetch(`${BACKEND_URL}/api/v1/investitii/monte-carlo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

  return new NextResponse(await upstream.text(), {
    status: upstream.status,
    headers: { "Content-Type": upstream.headers.get("Content-Type") ?? "application/json" },
  });
}
