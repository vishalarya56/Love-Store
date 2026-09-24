import { NextResponse } from "next/server";
import { randomInt } from "crypto";
import { db } from "@/lib/db";
import { createSession, setSessionCookie } from "@/lib/auth";

// POST /api/auth/guest
// Login-free mode: creates a lightweight anonymous creator and session.
export async function POST() {
  let creator;
  for (let attempt = 0; attempt < 5; attempt++) {
    const phone = String(9000000000 + randomInt(0, 1000000000));
    try {
      creator = await db.creator.create({
        data: { name: "Guest", phone },
      });
      break;
    } catch (error) {
      if (attempt === 4) throw error;
    }
  }

  if (!creator) {
    return NextResponse.json(
      { success: false, error: { code: "DATABASE_ERROR", message: "Could not create a guest session." } },
      { status: 500 },
    );
  }

  const token = await createSession(creator.id);
  await setSessionCookie(token);

  return NextResponse.json({
    success: true,
    data: { creatorId: creator.id, name: creator.name, phone: creator.phone },
  });
}
