import { NextRequest, NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary-server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: "crm/user-image",
            upload_preset: "alfajr_user_images",
          },
          (error, result) => {
            if (error) {
              reject(error);
              return;
            }
            resolve(result);
          },
        )
        .end(buffer);
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { public_id, secure_url } = result as any;

    return NextResponse.json({
      public_id,
      secure_url,
    });
  } catch (error) {
    console.error("Error uploading to Cloudinary:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
