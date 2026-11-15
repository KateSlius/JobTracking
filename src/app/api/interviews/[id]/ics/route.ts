import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildIcs, icsFileName } from "@/lib/ics";
import { interviewToCalendarEvent } from "@/lib/interview-event";

/** Download one interview as an .ics file (Apple Calendar, Outlook desktop, anything else). */
export async function GET(_request: Request, { params }: RouteContext<"/api/interviews/[id]/ics">) {
  const user = await requireUser();
  const { id } = await params;

  const interview = await db.interview.findFirst({
    where: { id, application: { userId: user.id } },
    include: {
      application: { select: { id: true, roleTitle: true, company: { select: { name: true } } } },
    },
  });
  if (!interview) return new Response("Not found", { status: 404 });

  const event = interviewToCalendarEvent(
    interview,
    {
      id: interview.application.id,
      roleTitle: interview.application.roleTitle,
      companyName: interview.application.company.name,
    },
    process.env.APP_URL,
  );

  return new Response(buildIcs(event), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${icsFileName(interview.application.company.name, interview.startsAt)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
