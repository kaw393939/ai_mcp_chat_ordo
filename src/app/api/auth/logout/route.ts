import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { logout } from "@/lib/auth";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("lms_session_token")?.value;

    if (token) {
      await logout(token);
    }

    // Clear both session and any simulated role cookie
    cookieStore.delete("lms_session_token");
    cookieStore.delete("lms_simulated_role");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
