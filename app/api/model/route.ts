import { NextResponse } from "next/server";

const R2_BASE = "https://pub-69d925864d0b4a39a1223b2185f89e5c.r2.dev";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get("path") || "models/rp_claudia_rigged_002_u3d.fbx";

  // Encode backslashes for R2 (FBX references textures as tex\filename)
  const r2Path = path.replace(/\\/g, "%5C");
  const res = await fetch(`${R2_BASE}/${r2Path}`);

  if (!res.ok) {
    return NextResponse.json({ error: "Not found", path }, { status: 404 });
  }

  const body = await res.arrayBuffer();

  const ext = path.split(".").pop()?.toLowerCase() || "bin";
  const contentTypes: Record<string, string> = {
    fbx: "application/octet-stream",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    glb: "model/gltf-binary",
  };

  return new NextResponse(body, {
    headers: {
      "Content-Type": contentTypes[ext] || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
