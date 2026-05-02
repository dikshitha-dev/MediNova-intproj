import React from "react";
import { motion } from "framer-motion";
import {
  useGetDashboardSummary,
  useGetDashboardActivity,
  useGetAdherenceStats,
  useGetTodayReminders,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity, CheckCircle2, Flame, Pill, Calendar,
  Clock, AlertCircle
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { format } from "date-fns";

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

const STATUS_COLORS: Record<string, string> = {
  taken: "bg-emerald-500",
  missed: "bg-red-500",
  skipped: "bg-zinc-500",
  pending: "bg-blue-500",
};

const STATUS_BADGE: Record<string, string> = {
  taken: "text-emerald-600 bg-emerald-500/10 border-emerald-200 dark:border-emerald-900",
  missed: "text-red-600 bg-red-500/10 border-red-200 dark:border-red-900",
  skipped: "text-zinc-500 bg-zinc-500/10 border-zinc-200 dark:border-zinc-800",
  pending: "text-blue-600 bg-blue-500/10 border-blue-200 dark:border-blue-900",
};

function ScrollReveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
      variants={{
        hidden: { opacity: 0, y: 28 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

export default function Dashboard() {
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary();
  const { data: activity, isLoading: isLoadingActivity } = useGetDashboardActivity();
  const { data: adherence, isLoading: isLoadingAdherence } = useGetAdherenceStats();
  const { data: todayReminders, isLoading: isLoadingToday } = useGetTodayReminders();

  return (
    <div className="p-6 md:p-10 space-y-10 max-w-7xl mx-auto w-full">

      {/* Page heading */}
      <ScrollReveal delay={0}>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
          <p className="text-muted-foreground mt-1">Your health summary for today.</p>
        </div>
      </ScrollReveal>

      {/* Stat cards — staggered */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Adherence Rate",
            icon: <Activity className="h-4 w-4 text-primary" />,
            value: isLoadingSummary ? null : `${summary?.adherenceRate ?? 0}%`,
            sub: "Overall medication adherence",
            delay: 0.05,
          },
          {
            label: "Current Streak",
            icon: <Flame className="h-4 w-4 text-orange-500" />,
            value: isLoadingSummary ? null : `${summary?.streak ?? 0} days`,
            sub: "Consecutive full adherence",
            delay: 0.15,
          },
          {
            label: "Today's Progress",
            icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
            value: isLoadingSummary ? null : `${summary?.todayTaken ?? 0} / ${summary?.todayTotal ?? 0}`,
            sub: "Doses taken today",
            delay: 0.25,
          },
          {
            label: "Active Reminders",
            icon: <Pill className="h-4 w-4 text-indigo-500" />,
            value: isLoadingSummary ? null : `${summary?.activeReminders ?? 0}`,
            sub: "Total active medications",
            delay: 0.35,
          },
        ].map((stat) => (
          <ScrollReveal key={stat.label} delay={stat.delay}>
            <Card className="bg-card/60 backdrop-blur-sm border-border/50 shadow-sm h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                {stat.icon}
              </CardHeader>
              <CardContent>
                {stat.value === null ? (
                  <Skeleton className="h-8 w-24 mb-1" />
                ) : (
                  <div className="text-2xl font-bold">{stat.value}</div>
                )}
                <p className="text-xs text-muted-foreground mt-1">{stat.sub}</p>
              </CardContent>
            </Card>
          </ScrollReveal>
        ))}
      </div>

      {/* Chart + Schedule row */}
      <div className="grid gap-6 md:grid-cols-7">
        <ScrollReveal delay={0} className="md:col-span-4">
          <Card className="bg-card/60 backdrop-blur-sm border-border/50 h-full">
            <CardHeader>
              <CardTitle>7-Day Adherence</CardTitle>
              <CardDescription>Your adherence rate over the last week.</CardDescription>
            </CardHeader>
            <CardContent className="h-[280px]">
              {isLoadingAdherence ? (
                <Skeleton className="h-full w-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={adherence} barCategoryGap="30%">
                    <XAxis
                      dataKey="date"
                      tickFormatter={(v) => format(new Date(v), "MMM d")}
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "hsl(var(--muted-foreground))" }}
                    />
                    <YAxis
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `${v}%`}
                      tick={{ fill: "hsl(var(--muted-foreground))" }}
                      domain={[0, 100]}
                    />
                    <Tooltip
                      cursor={{ fill: "hsl(var(--accent))", radius: 6 }}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      labelFormatter={(v) => format(new Date(v), "MMM d, yyyy")}
                      formatter={(v: number) => [`${v}%`, "Adherence"]}
                    />
                    <Bar dataKey="rate" radius={[6, 6, 0, 0]} maxBarSize={40}>
                      {(adherence ?? []).map((entry, idx) => (
                        <Cell
                          key={idx}
                          fill={entry.rate >= 80 ? "hsl(var(--chart-3))" : entry.rate >= 50 ? "hsl(var(--chart-1))" : "hsl(var(--chart-5))"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </ScrollReveal>

        <ScrollReveal delay={0.12} className="md:col-span-3">
          <Card className="bg-card/60 backdrop-blur-sm border-border/50 h-full">
            <CardHeader>
              <CardTitle>Today's Schedule</CardTitle>
              <CardDescription>Upcoming and completed doses.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingToday ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
                </div>
              ) : todayReminders && todayReminders.length > 0 ? (
                <div className="space-y-3">
                  {todayReminders.map((rem, idx) => (
                    <motion.div
                      key={`${rem.id}-${rem.scheduledTime}`}
                      initial={{ opacity: 0, x: 12 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, amount: 0.5 }}
                      transition={{ delay: idx * 0.08, duration: 0.35, ease: "easeOut" }}
                      className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-background/40"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-10 rounded-full ${STATUS_COLORS[rem.status] ?? "bg-primary"}`} />
                        <div>
                          <p className="font-medium text-sm">{rem.medicationName}</p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            <Clock className="h-3 w-3" />
                            {rem.dosage} · {rem.scheduledTime}
                          </div>
                        </div>
                      </div>
                      <Badge className={`text-xs capitalize border ${STATUS_BADGE[rem.status] ?? ""}`} variant="outline">
                        {rem.status}
                      </Badge>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  <Calendar className="h-10 w-10 mx-auto opacity-20 mb-3" />
                  <p className="text-sm">No reminders scheduled for today</p>
                </div>
              )}
            </CardContent>
          </Card>
        </ScrollReveal>
      </div>

      {/* Recent Activity */}
      <ScrollReveal delay={0}>
        <Card className="bg-card/60 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest health actions.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingActivity ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : !activity || activity.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <AlertCircle className="h-10 w-10 mx-auto opacity-20 mb-3" />
                <p className="text-sm">No recent activity</p>
              </div>
            ) : (
              <div className="space-y-2">
                {activity.map((item, idx) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.4 }}
                    transition={{ delay: idx * 0.07, duration: 0.35, ease: "easeOut" }}
                    className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-accent/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        item.type === "dose_taken" ? "bg-emerald-500" :
                        item.type === "dose_missed" ? "bg-red-500" :
                        item.type === "reminder_created" ? "bg-primary" :
                        "bg-muted-foreground"
                      }`} />
                      <div>
                        <p className="text-sm">{item.description}</p>
                        {item.medicationName && (
                          <p className="text-xs text-muted-foreground">{item.medicationName}</p>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0 ml-4">
                      {item.createdAt ? format(new Date(item.createdAt), "MMM d, h:mm a") : ""}
                    </span>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </ScrollReveal>

    </div>
  );
}
