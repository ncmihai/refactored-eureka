import config from "@payload-config";
import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import type { AppAuthUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const payload = await getPayload({ config });
  const auth = await payload.auth({ headers: req.headers });
  const user = auth.user as AppAuthUser | null;

  if (!user) {
    return NextResponse.json({
      authenticated: false,
      user: null,
    });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: user.id,
      email: user.email ?? null,
      nume: user.nume ?? null,
      role: user.role ?? null,
      accountStatus: user.accountStatus ?? null,
      firm: user.firm ?? null,
    },
  });
}
