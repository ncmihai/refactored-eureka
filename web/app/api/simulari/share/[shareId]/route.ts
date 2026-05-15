import config from "@payload-config";
import { NextResponse } from "next/server";
import { getPayload } from "payload";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ shareId: string }> },
) {
  const { shareId } = await params;
  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: "simulari",
    where: {
      and: [
        { shareId: { equals: shareId } },
        { status: { equals: "active" } },
      ],
    },
    depth: 1,
    limit: 1,
    overrideAccess: true,
  });

  const doc = result.docs[0];
  if (!doc) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (new Date(String(doc.shareExpiresAt)).getTime() < Date.now()) {
    return NextResponse.json({ error: "expired" }, { status: 410 });
  }

  return NextResponse.json(doc);
}
