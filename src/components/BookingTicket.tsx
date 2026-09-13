import { Check } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useRef } from "react";

interface BookingTicketProps {
  workshopTitle: string;
  sessionStartAt: string;
  sessionEndAt: string;
  sessionLocation: string;
  checkInToken: string;
  timezone?: string;
}

export function BookingTicket({
  workshopTitle,
  sessionStartAt,
  sessionEndAt,
  sessionLocation,
  checkInToken,
  timezone,
}: BookingTicketProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, checkInToken, {
        width: 120,
        margin: 1,
        color: { dark: "#1a1614", light: "#faf8f5" },
      }).catch(() => {});
    }
  }, [checkInToken]);

  return (
    <div className="rounded-xl border border-ink/10 bg-paper-card p-5">
      <div className="flex flex-col sm:flex-row items-start gap-4">
        <canvas
          ref={canvasRef}
          className="rounded-lg flex-shrink-0"
          aria-label="Check-in QR code"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-sage-50 flex items-center justify-center">
              <Check className="w-4 h-4 text-sage-600" />
            </div>
            <span className="text-sm font-medium text-ink">
              Booking confirmed
            </span>
          </div>
          <p className="text-sm font-medium text-ink truncate">
            {workshopTitle}
          </p>
          <p className="text-xs text-ink-muted mt-1">
            {new Date(sessionStartAt).toLocaleString("en-GB", {
              timeZone: timezone || undefined,
              weekday: "short",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
          <p className="text-xs text-ink-muted">
            Ends{" "}
            {new Date(sessionEndAt).toLocaleTimeString("en-GB", {
              timeZone: timezone || undefined,
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            ({timezone || Intl.DateTimeFormat().resolvedOptions().timeZone})
          </p>
          <p className="text-xs text-ink-muted">{sessionLocation}</p>
          <p className="text-xs text-ink-faint mt-2 font-mono break-all">
            Token: {checkInToken}
          </p>
        </div>
      </div>
      <p className="text-xs text-ink-faint mt-3 pt-3 border-t border-ink/5">
        Show this code or token at check-in. The organizer scans or looks up
        your token to verify attendance.
      </p>
    </div>
  );
}
