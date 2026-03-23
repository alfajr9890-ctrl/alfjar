import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const { uid } = await request.json();

    if (!uid) {
      return NextResponse.json(
        { success: false, error: "UID is required." },
        { status: 400 },
      );
    }

    // Set the session cookie
    (await cookies()).set("session", uid, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/",
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to create session:", error);
    return NextResponse.json(
      { success: false, error: "An internal server error occurred." },
      { status: 500 },
    );
  }
}
