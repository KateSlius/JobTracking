"use client";

import { useCallback, useState, useTransition } from "react";
import { CalendarPlus, MapPin, Pencil, Plus, Trash2, Users, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { INTERVIEW_TYPE_LABEL } from "@/lib/constants";
import { formatDate, formatEventTime, formatTime } from "@/lib/format";
import { googleCalendarUrl, outlookCalendarUrl } from "@/lib/ics";
import { interviewToCalendarEvent, type InterviewForCalendar } from "@/lib/interview-event";
import type { InterviewFormValues } from "@/lib/validation/interview";
import type { InterviewFormState } from "@/server/actions/interviews";
import { InterviewForm } from "./interview-form";

export type InterviewItem = InterviewForCalendar & {
  prepNotes: string | null;
  outcome: string | null;
  isPast: boolean;
};

type FormAction = (state: InterviewFormState, formData: FormData) => Promise<InterviewFormState>;

type Props = {
  application: { id: string; roleTitle: string; companyName: string };
  interviews: InterviewItem[];
  appUrl: string | null;
  createAction: FormAction;
  updateAction: (
    id: string,
    state: InterviewFormState,
    formData: FormData,
  ) => Promise<InterviewFormState>;
  deleteAction: (id: string) => Promise<void>;
};

function toFormValues(i: InterviewItem): InterviewFormValues {
  return {
    type: i.type,
    stage: i.stage ?? "",
    date: formatDate(i.startsAt),
    startTime: formatTime(i.startsAt),
    endTime: formatTime(i.endsAt),
    location: i.location ?? "",
    meetingUrl: i.meetingUrl ?? "",
    interviewers: i.interviewers ?? "",
    prepNotes: i.prepNotes ?? "",
    outcome: i.outcome ?? "",
  };
}

export function InterviewsSection({
  application,
  interviews,
  appUrl,
  createAction,
  updateAction,
  deleteAction,
}: Props) {
  // null = closed, "new" = adding, otherwise the id being edited.
  const [editing, setEditing] = useState<string | null>(null);
  const close = useCallback(() => setEditing(null), []);
  const upcoming = interviews.filter((i) => !i.isPast);
  const past = interviews.filter((i) => i.isPast).reverse();

  const renderItem = (i: InterviewItem) =>
    editing === i.id ? (
      <li key={i.id}>
        <InterviewForm
          action={updateAction.bind(null, i.id)}
          initialValues={toFormValues(i)}
          submitLabel="Save interview"
          onDone={close}
        />
      </li>
    ) : (
      <InterviewRow
        key={i.id}
        interview={i}
        application={application}
        appUrl={appUrl}
        onEdit={() => setEditing(i.id)}
        deleteAction={deleteAction}
      />
    );

  return (
    <div className="flex flex-col gap-4">
      {interviews.length === 0 && editing !== "new" && (
        <p className="text-muted-foreground text-sm">No interviews scheduled.</p>
      )}
      {upcoming.length > 0 && <ul className="flex flex-col gap-3">{upcoming.map(renderItem)}</ul>}
      {editing === "new" ? (
        <InterviewForm action={createAction} submitLabel="Add interview" onDone={close} />
      ) : (
        <Button variant="outline" className="w-fit" onClick={() => setEditing("new")}>
          <Plus /> Add interview
        </Button>
      )}
      {past.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Past
          </h3>
          <ul className="flex flex-col gap-3">{past.map(renderItem)}</ul>
        </div>
      )}
    </div>
  );
}

function InterviewRow({
  interview: i,
  application,
  appUrl,
  onEdit,
  deleteAction,
}: {
  interview: InterviewItem;
  application: Props["application"];
  appUrl: string | null;
  onEdit: () => void;
  deleteAction: (id: string) => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  const event = interviewToCalendarEvent(i, application, appUrl);
  const label = `${INTERVIEW_TYPE_LABEL[i.type]} interview on ${formatEventTime(i.startsAt)}`;

  return (
    <li className="flex flex-col gap-2 rounded-lg border p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col">
          <p className="font-medium">
            {formatEventTime(i.startsAt)}–{formatTime(i.endsAt)}
          </p>
          <p className="text-muted-foreground text-sm">
            {INTERVIEW_TYPE_LABEL[i.type]}
            {i.stage ? ` · ${i.stage}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {!i.isPast && (
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
                <CalendarPlus /> Add to calendar
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-52">
                <DropdownMenuItem
                  render={
                    <a href={googleCalendarUrl(event)} target="_blank" rel="noopener noreferrer" />
                  }
                >
                  Google Calendar
                </DropdownMenuItem>
                <DropdownMenuItem
                  render={
                    <a
                      href={outlookCalendarUrl(event, "personal")}
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  }
                >
                  Outlook.com
                </DropdownMenuItem>
                <DropdownMenuItem
                  render={
                    <a
                      href={outlookCalendarUrl(event, "work")}
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  }
                >
                  Outlook (work or school)
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem render={<a href={`/api/interviews/${i.id}/ics`} download />}>
                  Download .ics (Apple, other apps)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button variant="ghost" size="icon-sm" onClick={onEdit} aria-label={`Edit ${label}`}>
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={pending}
            aria-label={`Delete ${label}`}
            onClick={() => {
              if (!window.confirm(`Delete the ${label}?`)) return;
              startTransition(() => deleteAction(i.id));
            }}
          >
            <Trash2 />
          </Button>
        </div>
      </div>
      <ul className="text-muted-foreground flex flex-col gap-1 text-sm">
        {i.location && (
          <li className="flex items-start gap-2">
            <MapPin className="mt-0.5 size-4 shrink-0" aria-label="Address" />
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(i.location)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground underline underline-offset-4"
            >
              {i.location}
            </a>
          </li>
        )}
        {i.meetingUrl && (
          <li className="flex items-start gap-2">
            <Video className="mt-0.5 size-4 shrink-0" aria-label="Meeting link" />
            <a
              href={i.meetingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground truncate underline underline-offset-4"
            >
              Join meeting
            </a>
          </li>
        )}
        {i.interviewers && (
          <li className="flex items-start gap-2">
            <Users className="mt-0.5 size-4 shrink-0" aria-label="Interviewers" />
            {i.interviewers}
          </li>
        )}
      </ul>
      {i.prepNotes && (
        <details className="text-sm">
          <summary className="text-muted-foreground hover:text-foreground cursor-pointer text-xs">
            Prep notes
          </summary>
          <p className="mt-1 whitespace-pre-line">{i.prepNotes}</p>
        </details>
      )}
      {i.outcome && (
        <p className="text-sm">
          <span className="text-muted-foreground">How it went: </span>
          {i.outcome}
        </p>
      )}
    </li>
  );
}
