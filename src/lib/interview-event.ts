import type { InterviewType } from "@/generated/prisma/enums";
import { INTERVIEW_TYPE_LABEL } from "@/lib/constants";
import type { CalendarEvent } from "@/lib/ics";

export type InterviewForCalendar = {
  id: string;
  icsUid: string;
  icsSequence: number;
  type: InterviewType;
  stage: string | null;
  startsAt: Date;
  endsAt: Date;
  location: string | null;
  meetingUrl: string | null;
  interviewers: string | null;
};

/**
 * One interview → the event used by the .ics download and the Google/Outlook links, so all
 * three always agree. Prep notes and outcome are left out on purpose: calendars are often
 * synced to work accounts or shared, and those notes are private.
 */
export function interviewToCalendarEvent(
  interview: InterviewForCalendar,
  application: { id: string; roleTitle: string; companyName: string },
  appUrl?: string | null,
): CalendarEvent {
  const applicationUrl = appUrl
    ? `${appUrl.replace(/\/$/, "")}/applications/${application.id}`
    : null;
  const description = [
    `${INTERVIEW_TYPE_LABEL[interview.type]} interview${interview.stage ? ` – ${interview.stage}` : ""}`,
    interview.meetingUrl && `Join: ${interview.meetingUrl}`,
    interview.interviewers && `With: ${interview.interviewers}`,
    applicationUrl && `Your notes: ${applicationUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    uid: interview.icsUid,
    sequence: interview.icsSequence,
    start: interview.startsAt,
    end: interview.endsAt,
    title: `Interview: ${application.roleTitle} – ${application.companyName}`,
    description,
    // Video calls put the link in the location so it's one tap away in most calendar apps.
    location: interview.location ?? interview.meetingUrl,
    url: interview.meetingUrl ?? applicationUrl,
  };
}
