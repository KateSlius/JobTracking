import { requireUser } from "@/lib/auth";
import { buildExportZip } from "@/server/services/account";

/** Download everything as a ZIP (UK GDPR access and portability). */
export async function GET() {
  const user = await requireUser();
  const zip = await buildExportZip(user.id);
  const date = new Date().toISOString().slice(0, 10);
  return new Response(new Blob([zip as BlobPart], { type: "application/zip" }), {
    headers: {
      "Content-Disposition": `attachment; filename="job-tracker-export-${date}.zip"`,
      "Cache-Control": "private, no-store",
    },
  });
}
