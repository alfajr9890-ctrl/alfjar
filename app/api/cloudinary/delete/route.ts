import { NextRequest, NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary-server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { publicId } = body;

    if (!publicId) {
      return NextResponse.json(
        { error: "No publicId provided" },
        { status: 400 },
      );
    }

    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result === "ok") {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { success: false, error: "Cloudinary delete failed" },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Error deleting from Cloudinary:", error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
