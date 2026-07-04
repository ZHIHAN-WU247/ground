import type { TrackingEvent } from "@ground/shared";
import { StatusBadge } from "./StatusBadge";
import { T } from "./I18nProvider";

interface TrackingTimelineProps {
  events: TrackingEvent[];
}

export function TrackingTimeline({ events }: TrackingTimelineProps) {
  if (events.length === 0) {
    return <div className="empty-state"><T id="tracking.noEvents" /></div>;
  }

  const sortedEvents = [...events].sort((current, next) => new Date(next.occurredAt).getTime() - new Date(current.occurredAt).getTime());

  return (
    <ol className="timeline timeline-plain">
      {sortedEvents.map((event) => (
        <li key={event.id}>
          <span className="timeline-dot" aria-hidden />
          <div className="timeline-content">
            <div className="timeline-head">
              <StatusBadge status={event.status} />
              <span className="soft">{new Date(event.occurredAt).toLocaleString("zh-CN")}</span>
            </div>
            <h3>{event.title}</h3>
            <p>{event.description}</p>
            <p className="soft">{event.location}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
