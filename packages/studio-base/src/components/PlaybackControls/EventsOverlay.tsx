// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { alpha } from "@mui/material";
import { clamp } from "lodash";
import { makeStyles } from "tss-react/mui";

import { fromSec, subtract, toSec } from "@foxglove/rostime";
import {
  MessagePipelineContext,
  useMessagePipeline,
} from "@foxglove/studio-base/components/MessagePipeline";
import {
  DataSourceEvent,
  EventsStore,
  useEvents,
} from "@foxglove/studio-base/context/EventsContext";
import {
  TimelineInteractionStateStore,
  useTimelineInteractionState,
} from "@foxglove/studio-base/context/TimelineInteractionStateContext";

const useStyles = makeStyles()(({ transitions, palette }) => ({
  root: {
    inset: 0,
    pointerEvents: "none",
    position: "absolute",
    display: "flex",
    alignItems: "center",
  },
  tick: {
    transition: transitions.create("height", { duration: transitions.duration.shortest }),
    backgroundBlendMode: "overlay",
    backgroundColor: alpha(palette.info.main, 0.58),
    position: "absolute",
    height: 6,
  },
  tickHovered: {
    transition: transitions.create("height", { duration: transitions.duration.shortest }),
    backgroundColor: alpha(palette.info.main, 0.58),
    border: `1px solid ${palette.info.main}`,
    height: 12,
  },
  tickSelected: {
    transition: transitions.create("height", {
      duration: transitions.duration.shortest,
    }),
    backgroundColor: alpha(palette.info.main, 0.67),
    height: 12,
  },
}));

const selectEvents = (store: EventsStore) => store.events;
const selectHoveredEvent = (store: TimelineInteractionStateStore) => store.hoveredEvent;
const selectEventsAtHoverValue = (store: TimelineInteractionStateStore) => store.eventsAtHoverValue;
const selectSelectedEventId = (store: EventsStore) => store.selectedEventId;

function EventTick({ event }: { event: DataSourceEvent }): JSX.Element {
  const eventsAtHoverValue = useTimelineInteractionState(selectEventsAtHoverValue);
  const hoveredEvent = useTimelineInteractionState(selectHoveredEvent);
  const selectedEventId = useEvents(selectSelectedEventId);

  const selectStartTime = (ctx: MessagePipelineContext) => ctx.playerState.activeData?.startTime;
  const selectEndTime = (ctx: MessagePipelineContext) => ctx.playerState.activeData?.endTime;
  const playbackStartTime = useMessagePipeline(selectStartTime) ?? fromSec(0);
  const playbackEndTime = useMessagePipeline(selectEndTime) ?? fromSec(0);
  const playbackDurationSec = toSec(playbackEndTime) - toSec(playbackStartTime);

  const { classes, cx } = useStyles();

  const startPosition = toSec(subtract(event.startTime, playbackStartTime)) / playbackDurationSec;
  const endPosition = toSec(subtract(event.endTime, playbackStartTime)) / playbackDurationSec;

  const left = `calc(${clamp(startPosition, 0, 1) * 100}% - 1px)`;
  const right = `calc(100% - ${clamp(endPosition, 0, 1) * 100}% - 1px)`;

  return (
    <div
      className={cx(classes.tick, {
        [classes.tickHovered]: hoveredEvent
          ? event.id === hoveredEvent.id
          : eventsAtHoverValue[event.id] != undefined,
        [classes.tickSelected]: selectedEventId === event.id,
      })}
      style={{ left, right }}
    />
  );
}

const MemoEventTick = React.memo(EventTick);

export function EventsOverlay(): JSX.Element {
  const events = useEvents(selectEvents);
  const { classes } = useStyles();

  return (
    <div className={classes.root}>
      {(events.value ?? []).map((event) => (
        <MemoEventTick key={event.id} event={event} />
      ))}
    </div>
  );
}
