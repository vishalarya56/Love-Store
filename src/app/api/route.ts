import { ok } from "@/lib/api";

// GET /api — health check
export async function GET() {
  return ok({ status: "ok", service: "lovestory", time: new Date().toISOString() });
}
