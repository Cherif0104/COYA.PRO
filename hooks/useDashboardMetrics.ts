import { useMemo } from 'react';
import type { Project, TimeLog, Invoice, Expense, LeaveRequest, Course } from '../types';

function getWeekBounds(date: Date): { start: Date; end: Date } {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  const start = new Date(d);
  const end = new Date(d);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export interface DashboardMetrics {
  completionRate: number;
  completedProjects: number;
  avgCourseProgress: number;
  totalHours: number;
  hoursTrend: number;
  paidInvoices: number;
  unpaidInvoices: number;
  netIncome: number;
  financialHealth: number;
  pendingLeaves: number;
  approvedLeaves: number;
  totalProjects: number;
  activeProjects: number;
}

export function useDashboardMetrics(
  projects: Project[],
  courses: Course[],
  timeLogs: TimeLog[],
  invoices: Invoice[],
  expenses: Expense[],
  leaveRequests: LeaveRequest[],
  userId?: string
): DashboardMetrics {
  return useMemo(() => {
    const now = new Date();
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const { start: thisWeekStart } = getWeekBounds(now);
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    const completedProjects = projects.filter((p) => p.status === 'Completed').length;
    const completionRate =
      projects.length > 0 ? (completedProjects / projects.length) * 100 : 0;

    const userLogs = userId ? timeLogs.filter((log) => log.userId === userId) : timeLogs;
    const hoursThisWeek = userLogs
      .filter((log) => new Date(log.date) >= thisWeekStart)
      .reduce((sum, log) => sum + log.duration, 0) / 60;
    const hoursLastWeek = userLogs
      .filter((log) => {
        const d = new Date(log.date);
        return d >= lastWeekStart && d < thisWeekStart;
      })
      .reduce((sum, log) => sum + log.duration, 0) / 60;
    const hoursTrend =
      hoursLastWeek > 0 ? ((hoursThisWeek - hoursLastWeek) / hoursLastWeek) * 100 : 0;

    const avgCourseProgress =
      courses.length > 0
        ? courses.reduce((sum, c) => sum + c.progress, 0) / courses.length
        : 0;

    const recentTimeLogs = timeLogs.filter((log) => new Date(log.date) >= last30Days);
    const totalHours = recentTimeLogs.reduce((sum, log) => sum + log.duration, 0) / 60;

    const paidInvoices = invoices
      .filter((inv) => inv.status === 'Paid')
      .reduce((sum, inv) => sum + inv.amount, 0);
    const unpaidInvoices = invoices
      .filter((inv) => inv.status !== 'Paid' && inv.status !== 'Draft')
      .reduce((sum, inv) => sum + inv.amount, 0);
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const netIncome = paidInvoices - totalExpenses;
    const financialHealth =
      paidInvoices > 0 ? (netIncome / paidInvoices) * 100 : 0;

    const pendingLeaves = leaveRequests.filter(
      (req) => String(req.status).toLowerCase() === 'pending'
    ).length;
    const approvedLeaves = leaveRequests.filter(
      (req) => String(req.status).toLowerCase() === 'approved'
    ).length;

    return {
      completionRate: Math.round(completionRate),
      completedProjects,
      avgCourseProgress: Math.round(avgCourseProgress),
      totalHours: Math.round(totalHours * 10) / 10,
      hoursTrend: Math.round(hoursTrend * 10) / 10,
      paidInvoices,
      unpaidInvoices,
      netIncome,
      financialHealth: Math.round(financialHealth),
      pendingLeaves,
      approvedLeaves,
      totalProjects: projects.length,
      activeProjects: projects.filter((p) => p.status === 'In Progress').length,
    };
  }, [
    projects,
    courses,
    timeLogs,
    invoices,
    expenses,
    leaveRequests,
    userId,
  ]);
}
