export function formatDate(iso: string, timezone?: string): string {
  const date = new Date(iso);
  const options: Intl.DateTimeFormatOptions = {
    weekday: "short",
    month: "short",
    day: "numeric",
  };
  if (timezone) {
    options.timeZone = timezone;
  }
  return date.toLocaleDateString("en-GB", options);
}

export function formatTime(iso: string, timezone?: string): string {
  const date = new Date(iso);
  const options: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: timezone,
  };
  return date.toLocaleTimeString("en-GB", options);
}

export function formatDateTime(iso: string, timezone?: string): string {
  return `${formatDate(iso, timezone)}, ${formatTime(iso, timezone)}`;
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatPrice(price: number): string {
  if (price === 0) return "Free demo";
  return `£${(price / 100).toFixed(0)}`;
}

export function getOffsetLabel(timezone: string): string {
  const date = new Date();
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    timeZoneName: "shortOffset",
  });
  const parts = formatter.formatToParts(date);
  const tzPart = parts.find((p) => p.type === "timeZoneName");
  return tzPart?.value ?? "";
}

export function getZoneLabel(timezone: string): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      timeZoneName: "short",
    });
    const parts = formatter.formatToParts(new Date());
    const tzPart = parts.find((p) => p.type === "timeZoneName");
    return tzPart?.value ?? timezone;
  } catch {
    return timezone;
  }
}

export function isPast(iso: string): boolean {
  return new Date(iso).getTime() < Date.now();
}
