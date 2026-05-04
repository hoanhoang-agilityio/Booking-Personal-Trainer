"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { DateClickArg } from "@fullcalendar/interaction";
import type { EventClickArg, EventContentArg } from "@fullcalendar/core";
import type { EventInput } from "@fullcalendar/core";
import dayjs from "@/lib/date-time/utc-dayjs";
import type { Booking } from "@/services/bookings/bookings.service";
import { getBookings } from "@/services/bookings/bookings.service";
import { useProfile } from "@/hooks/useProfile";
import BookingDetailModal from "@/components/bookings/BookingDetailModal";
import CreateBookingFromCalendarModal from "@/components/bookings/CreateBookingFromCalendarModal";
import { useToast } from "@/context/ToastContext";

interface BookingEvent extends EventInput {
  extendedProps: {
    booking: Booking;
    status: string;
    isPast: boolean;
  };
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "warning",
  CONFIRMED: "success",
  REJECTED: "danger",
  CANCELLED: "danger",
};

function getDisplayName(user?: { firstName?: string; lastName?: string; userName?: string } | null): string {
  if (!user) return "—";
  const parts = [user.firstName, user.lastName].filter(Boolean);
  if (parts.length > 0) return parts.join(" ");
  return user.userName?.trim() ? user.userName : "—";
}

function formatBookingEventTimeRange(booking: Booking): string {
  const start = dayjs.utc(booking.startTime);
  const end = dayjs.utc(booking.endTime);
  if (!start.isValid() || !end.isValid()) {
    return "—";
  }
  return `${start.format("HH:mm")} – ${end.format("HH:mm")}`;
}

const Calendar: React.FC = () => {
  const [events, setEvents] = useState<BookingEvent[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateBookingOpen, setIsCreateBookingOpen] = useState(false);
  const [selectedDateLocal, setSelectedDateLocal] = useState<string | null>(null);
  const [prefilledStartClockTime, setPrefilledStartClockTime] = useState<string | null>(null);
  const calendarRef = useRef<FullCalendar>(null);
  const { user: currentUser, isLoading: isProfileLoading } = useProfile();
  const toast = useToast();

  const fetchBookings = useCallback(async () => {
    if (!currentUser) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await getBookings({ limit: 200 });
      const now = dayjs();
      const bookingEvents: BookingEvent[] = res.bookings.map((b) => {
        const trainerName = b.trainer ? getDisplayName(b.trainer) : "—";
        const traineeName = b.trainee ? getDisplayName(b.trainee) : "—";
        const title = `${trainerName} – ${traineeName}`;
        const colorKey = STATUS_COLORS[b.status] ?? "primary";
        const endDate = dayjs(b.endTime);
        const isPast = endDate.isValid() && endDate.valueOf() < now.valueOf();

        return {
          id: b.id,
          title,
          start: b.startTime,
          end: b.endTime,
          extendedProps: {
            booking: b,
            status: colorKey,
            isPast,
          },
        };
      });
      setEvents(bookingEvents);
    } catch {
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (isProfileLoading) return;
    fetchBookings();
  }, [fetchBookings, isProfileLoading]);

  const handleEventClick = (clickInfo: EventClickArg) => {
    const props = clickInfo.event.extendedProps as {
      booking: Booking;
      isPast: boolean;
    };
    setSelectedBooking(props.booking);
    setIsModalOpen(true);
  };

  const handleDateClick = (clickInfo: DateClickArg) => {
    if (currentUser?.role !== "TRAINEE") return;
    const clicked = dayjs(clickInfo.date);
    if (!clicked.isValid()) return;
    const today = dayjs().startOf("day");
    const clickedDay = clicked.startOf("day");
    if (clickedDay.isBefore(today)) return;
    const dateLocal = clicked.format("YYYY-MM-DD");
    const timeLocal = clicked.format("HH:mm");
    setSelectedDateLocal(dateLocal);
    setPrefilledStartClockTime(timeLocal);
    setIsCreateBookingOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedBooking(null);
  };

  const getEventClassNames = (_arg: EventContentArg): string[] => ["cursor-pointer"];

  const renderEventContent = (eventInfo: EventContentArg) => {
    const props = eventInfo.event.extendedProps as {
      status: string;
      isPast: boolean;
      booking: Booking;
    };
    const colorClass = `fc-bg-${props.status}`;
    const isConfirmed = props.status === "success";
    const timeRangeLabel = formatBookingEventTimeRange(props.booking);
    const isMonthView = eventInfo.view.type === "dayGridMonth";
    const eventShellClass = isMonthView
      ? "event-fc-color event-fc-color--month flex min-w-0 flex-1 cursor-pointer flex-col gap-0.5 rounded-sm px-1 py-0.5 fc-event-main"
      : "event-fc-color flex min-w-0 flex-1 cursor-pointer items-center gap-1 rounded-sm px-1.5 py-1 fc-event-main";

    return (
      <div
        className={`${eventShellClass} ${colorClass} ${props.isPast ? "opacity-60" : ""} ${isConfirmed ? "border-l-2 border-l-success-500" : ""}`}
      >
        {!isMonthView ? <div className="fc-daygrid-event-dot shrink-0" /> : null}
        {isMonthView ? (
          <>
            <div className="fc-event-time shrink-0 leading-none">{timeRangeLabel}</div>
            <div className="fc-event-title min-w-0 truncate leading-tight">{eventInfo.event.title}</div>
          </>
        ) : (
          <>
            <div className="fc-event-time shrink-0">{timeRangeLabel}</div>
            <div className="fc-event-title min-w-0 truncate">{eventInfo.event.title}</div>
          </>
        )}
      </div>
    );
  };

  if (isProfileLoading || isLoading) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-gray-200 bg-white py-12 dark:border-gray-800 dark:bg-white/[0.03]">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          Loading calendar...
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="custom-calendar">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay",
          }}
          events={events}
          selectable={false}
          eventClick={handleEventClick}
          dateClick={handleDateClick}
          eventContent={renderEventContent}
          eventClassNames={getEventClassNames}
          dayCellClassNames={(arg) => {
            const cellDay = dayjs(arg.date).startOf("day");
            const today = dayjs().startOf("day");
            if (!cellDay.isValid()) return [];
            if (cellDay.isBefore(today)) {
              return ["opacity-50", "cursor-not-allowed"];
            }
            if (currentUser?.role !== "TRAINEE") return [];
            return ["cursor-pointer"];
          }}
          views={{
            dayGridMonth: {
              dayMaxEvents: true,
              moreLinkClick: "popover",
              aspectRatio: 1.48,
            },
            timeGridWeek: { height: "auto" },
            timeGridDay: { height: "auto" },
          }}
        />
      </div>

      <CreateBookingFromCalendarModal
        isOpen={isCreateBookingOpen}
        selectedDateLocal={selectedDateLocal ?? dayjs.utc().format("YYYY-MM-DD")}
        prefilledStartClockTime={prefilledStartClockTime}
        onClose={() => {
          setIsCreateBookingOpen(false);
          setSelectedDateLocal(null);
          setPrefilledStartClockTime(null);
        }}
        onSuccess={() => {
          setIsCreateBookingOpen(false);
          setSelectedDateLocal(null);
          setPrefilledStartClockTime(null);
          fetchBookings();
        }}
      />

      <BookingDetailModal
        isOpen={isModalOpen}
        booking={selectedBooking}
        onClose={handleCloseModal}
        onUpdated={() => {
          toast.success("Booking updated");
          handleCloseModal();
          void fetchBookings();
        }}
      />
    </div>
  );
};

export default Calendar;
