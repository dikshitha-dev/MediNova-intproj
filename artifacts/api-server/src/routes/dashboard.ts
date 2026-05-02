import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { remindersTable, doseLogsTable, activityLogTable } from "@workspace/db";
import { eq, and, gte, desc, sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/dashboard/summary", async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];

    const allReminders = await db.select().from(remindersTable);
    const activeReminders = allReminders.filter((r) => r.isActive);

    const todayReminders = activeReminders.filter((r) => r.startDate <= today);
    const todayTotal = todayReminders.reduce((sum, r) => sum + (r.times as string[]).length, 0);

    const todayStart = new Date(today + "T00:00:00Z");
    const todayLogs = await db.select().from(doseLogsTable).where(
      gte(doseLogsTable.createdAt, todayStart)
    );

    const todayTaken = todayLogs.filter((l) => l.status === "taken").length;
    const todayMissed = todayLogs.filter((l) => l.status === "missed").length;
    const adherenceRate = todayTotal > 0 ? Math.round((todayTaken / todayTotal) * 100) : 0;

    // Calculate streak (consecutive days of full adherence)
    let streak = 0;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentLogs = await db.select().from(doseLogsTable).where(
      gte(doseLogsTable.createdAt, sevenDaysAgo)
    );

    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const dayLogs = recentLogs.filter((l) => l.createdAt.toISOString().split("T")[0] === dateStr);
      if (dayLogs.length > 0 && dayLogs.every((l) => l.status === "taken")) {
        streak++;
      } else {
        break;
      }
    }

    res.json({
      totalReminders: allReminders.length,
      activeReminders: activeReminders.length,
      todayTotal,
      todayTaken,
      todayMissed,
      adherenceRate,
      streak,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch dashboard summary" });
  }
});

router.get("/dashboard/activity", async (req, res) => {
  try {
    const activity = await db.select().from(activityLogTable)
      .orderBy(desc(activityLogTable.createdAt))
      .limit(20);
    res.json(activity);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch activity" });
  }
});

router.get("/dashboard/adherence", async (req, res) => {
  try {
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const dayStart = new Date(dateStr + "T00:00:00Z");
      const dayEnd = new Date(dateStr + "T23:59:59Z");

      const logs = await db.select().from(doseLogsTable).where(
        and(
          gte(doseLogsTable.createdAt, dayStart),
          // We use a raw comparison for end of day
          sql`${doseLogsTable.createdAt} <= ${dayEnd}`
        )
      );

      const taken = logs.filter((l) => l.status === "taken").length;
      const missed = logs.filter((l) => l.status === "missed").length;
      const total = logs.length;
      const rate = total > 0 ? Math.round((taken / total) * 100) : 0;

      result.push({ date: dateStr, taken, missed, total, rate });
    }
    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch adherence stats" });
  }
});

export default router;
