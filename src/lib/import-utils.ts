// Shared import utility functions — used by both CSV parser and confirm route

/**
 * Calculate totalHours from startTime/endTime/breakMinutes.
 * Handles overnight shifts (e.g., 22:00 → 06:00).
 */
export function calcTotalHours(startTime: string, endTime: string, breakMinutes: number): number {
  try {
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    // IMP-017: Guard against NaN from non-numeric time strings (e.g. "abc")
    if ([sh, sm, eh, em].some(v => !Number.isFinite(v))) return 0;
    let totalMinutes = (eh * 60 + em) - (sh * 60 + sm);
    if (totalMinutes < 0) totalMinutes += 24 * 60; // overnight shift
    totalMinutes -= breakMinutes;
    if (totalMinutes < 0) totalMinutes = 0;
    return Math.round((totalMinutes / 60) * 100) / 100;
  } catch {
    return 0;
  }
}
