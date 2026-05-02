import React from "react";
import { useGetDashboardSummary, useGetDashboardActivity, useGetAdherenceStats, useGetTodayReminders } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Activity, AlertCircle, CheckCircle2, Clock, Flame, Calendar, Pill } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary();
  const { data: activity, isLoading: isLoadingActivity } = useGetDashboardActivity();
  const { data: adherence, isLoading: isLoadingAdherence } = useGetAdherenceStats();
  const { data: todayReminders, isLoading: isLoadingToday } = useGetTodayReminders();

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto w-full">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
        <p className="text-muted-foreground mt-1">Here is your health summary for today.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Adherence Rate</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? <Skeleton className="h-8 w-20" /> : (
              <div className="text-2xl font-bold">{summary?.adherenceRate ?? 0}%</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Overall medication adherence</p>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50 backdrop-blur-sm border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
            <Flame className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? <Skeleton className="h-8 w-20" /> : (
              <div className="text-2xl font-bold">{summary?.streak ?? 0} days</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Consecutive full adherence</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Today's Progress</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? <Skeleton className="h-8 w-20" /> : (
              <div className="text-2xl font-bold">{summary?.todayTaken ?? 0} / {summary?.todayTotal ?? 0}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Doses taken today</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Active Reminders</CardTitle>
            <Pill className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? <Skeleton className="h-8 w-20" /> : (
              <div className="text-2xl font-bold">{summary?.activeReminders ?? 0}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Total active medications</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-7">
        <Card className="md:col-span-4 bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle>7-Day Adherence</CardTitle>
            <CardDescription>Your adherence rate over the last week.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {isLoadingAdherence ? (
              <div className="h-full flex items-center justify-center">
                <Skeleton className="h-full w-full" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={adherence}>
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(val) => format(new Date(val), 'MMM d')}
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `${val}%`}
                  />
                  <Tooltip 
                    cursor={{fill: 'var(--color-accent)'}}
                    contentStyle={{backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', borderRadius: '8px'}}
                    labelFormatter={(val) => format(new Date(val), 'MMM d, yyyy')}
                  />
                  <Bar dataKey="rate" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-3 bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle>Today's Schedule</CardTitle>
            <CardDescription>Upcoming and completed doses.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingToday ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : todayReminders && todayReminders.length > 0 ? (
              <div className="space-y-4">
                {todayReminders.map(rem => (
                  <div key={`${rem.id}-${rem.scheduledTime}`} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-background/50">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-10 rounded-full ${rem.status === 'taken' ? 'bg-green-500' : rem.status === 'missed' ? 'bg-red-500' : rem.status === 'skipped' ? 'bg-gray-500' : 'bg-blue-500'}`} />
                      <div>
                        <p className="font-medium">{rem.medicationName}</p>
                        <p className="text-xs text-muted-foreground">{rem.dosage} at {rem.scheduledTime}</p>
                      </div>
                    </div>
                    <Badge variant={rem.status === 'taken' ? 'default' : 'secondary'} className={
                      rem.status === 'taken' ? 'bg-green-500/10 text-green-600 hover:bg-green-500/20' : 
                      rem.status === 'missed' ? 'bg-red-500/10 text-red-600 hover:bg-red-500/20' : 
                      rem.status === 'skipped' ? 'bg-gray-500/10 text-gray-600 hover:bg-gray-500/20' : 
                      'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20'
                    }>
                      {rem.status.charAt(0).toUpperCase() + rem.status.slice(1)}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto opacity-20 mb-3" />
                <p>No reminders scheduled for today</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
