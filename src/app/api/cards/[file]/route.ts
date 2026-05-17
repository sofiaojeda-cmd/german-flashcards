import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

// Serves data/cards/*.json files to the client-side seed loader.
// Only allow safe filenames — no path traversal possible.
const ALLOWED = /^[a-z0-9-]+\.json$/;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ file: string }> }
) {
  const { file } = await params;

  if (!ALLOWED.test(file)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const filePath = join(process.cwd(), "data", "cards", file);
    const content = await readFile(filePath, "utf-8");
    return new NextResponse(content, {
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
