import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { AlarmClock, CalendarClock, Plus } from "lucide-react";
import { LinkButton } from "@/components/ui/link-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/applications/status-badge";
import { FunnelMeters } from "@/components/dashboard/funnel-meters";
import { StatTile } from "@/components/dashboard/stat-tile";
import { WeeklyChart } from "@/components/dashboard/weekly-chart";
import { INTERVIEW_TYPE_LABEL, STATUS_ORDER } from "@/lib/constants";
import {
  formatCalendarDate,
  formatCalendarDayMonth,
  formatDateLong,
  formatEventTime,
} from "@/lib/format";
import { getDashboard, type Dashboard } from "@/server/queries/dashboard";

export const metadata: Metadata = { title: "Dashboard" };

function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

function KpiRow({ d }: { d: Dashboard }) {
  const rate = d.response.rate;
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatTile
        label="Applied this week"
        value={String(d.period.thisWeek)}
        detail={`${d.period.previousWeek} last week`}
      />
      <StatTile
        label="Applied this month"
        value={String(d.period.thisMonth)}
        detail={`Since ${formatCalendarDayMonth(d.monthStart)}`}
      />
      <StatTile
        label="Response rate"
        value={rate == null ? "—" : `${Math.round(rate * 100)}%`}
        detail={
          d.response.applied
            ? `${d.response.responded} of ${plural(d.response.applied, "application")} heard back`
            : "Apply for a role to start tracking"
        }
      />
      <StatTile
        label="Active applications"
        value={String(d.active)}
        detail={`${d.byStatus.SAVED} saved to apply for`}
      />
    </div>
  );
}

function ListCard({
  title,
  description,
  empty,
  children,
}: {
  title: string;
  description?: string;
  empty: string;
  children: ReactNode[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {children.length ? (
          <ul className="flex flex-col divide-y">{children}</ul>
        ) : (
          <p className="text-muted-foreground text-sm">{empty}</p>
        )}
      </CardContent>
    </Card>
  );
}

function ListRow({
  href,
  title,
  meta,
  icon,
}: {
  href?: string;
  title: string;
  meta: string;
  icon?: ReactNode;
}) {
  const body = (
    <>
      {icon}
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-medium group-hover:underline">{title}</span>
        <span className="text-muted-foreground text-xs">{meta}</span>
      </span>
    </>
  );
  return (
    <li className="py-2 first:pt-0 last:pb-0">
      {href ? (
        <Link href={href} className="group flex items-start gap-2">
          {body}
        </Link>
      ) : (
        <div className="flex items-start gap-2">{body}</div>
      )}
    </li>
  );
}

function DashboardContent({ d }: { d: Dashboard }) {
  if (d.total === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-center">
        <p className="font-medium">Your dashboard fills up as you track applications</p>
        <p className="text-muted-foreground max-w-sm text-sm">
          Add your first application to see your pipeline, response rate and what needs attention.
        </p>
        <LinkButton href="/applications/new">
          <Plus /> Add application
        </LinkButton>
      </div>
    );
  }

  const attention = [
    ...d.overdueReminders.map((r) => (
      <ListRow
        key={`r-${r.id}`}
        href={r.application ? `/applications/${r.application.id}` : undefined}
        title={r.title}
        meta={`Overdue since ${formatEventTime(r.dueAt)}`}
        icon={
          <AlarmClock className="text-destructive mt-0.5 size-4 shrink-0" aria-label="Overdue" />
        }
      />
    )),
    ...d.closingSoon.map((a) => {
      const days = Math.round((a.closingDate!.getTime() - d.today.getTime()) / 86_400_000);
      const when = days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`;
      return (
        <ListRow
          key={`c-${a.id}`}
          href={`/applications/${a.id}`}
          title={`${a.roleTitle} · ${a.company.name}`}
          meta={`Closes ${when} (${formatCalendarDate(a.closingDate!)}) · not applied yet`}
          icon={
            <CalendarClock
              className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-400"
              aria-label="Closing soon"
            />
          }
        />
      );
    }),
  ];

  return (
    <div className="flex flex-col gap-6">
      <KpiRow d={d} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Applications sent per week</CardTitle>
              <CardDescription>Last 8 weeks, by date applied</CardDescription>
            </CardHeader>
            <CardContent>
              <WeeklyChart weeks={d.weekly} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Pipeline</CardTitle>
              <CardDescription>
                How far your {plural(d.response.applied, "application")} got. Percentages are of
                everything you applied for.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FunnelMeters stages={d.funnel} />
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <ListCard title="Needs attention" empty="You're all caught up.">
            {attention}
          </ListCard>
          <ListCard
            title="Upcoming interviews"
            description="Next 14 days"
            empty="No interviews in the next two weeks."
          >
            {d.upcomingInterviews.map((i) => (
              <ListRow
                key={i.id}
                href={`/applications/${i.application.id}`}
                title={`${i.application.roleTitle} · ${i.application.company.name}`}
                meta={`${formatEventTime(i.startsAt)} · ${INTERVIEW_TYPE_LABEL[i.type]}${i.stage ? ` · ${i.stage}` : ""}`}
              />
            ))}
          </ListCard>
          <Card>
            <CardHeader>
              <CardTitle>By status</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-1">
                {STATUS_ORDER.map((status) => (
                  <li key={status}>
                    <Link
                      href={`/applications?status=${status}`}
                      className="hover:bg-muted -mx-2 flex items-center justify-between rounded-md px-2 py-1"
                    >
                      <StatusBadge status={status} />
                      <span className="text-sm tabular-nums">{d.byStatus[status]}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

async function DashboardData() {
  const d = await getDashboard();
  return (
    <>
      <p className="text-muted-foreground -mt-4 text-sm">{formatDateLong(new Date())}</p>
      <DashboardContent d={d} />
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-label="Loading dashboard">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="bg-muted h-24 animate-pulse rounded-lg" />
        ))}
      </div>
      <div className="bg-muted h-72 animate-pulse rounded-lg" />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardData />
      </Suspense>
    </div>
  );
}
