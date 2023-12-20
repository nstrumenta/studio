// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { Button, Tooltip, alpha } from "@mui/material";
import { compact, noop } from "lodash";
import { Fragment } from "react";
import { makeStyles } from "tss-react/mui";

import { Time, fromSec, toSec } from "@foxglove/rostime";
import { HighlightedText } from "@foxglove/studio-base/components/HighlightedText";
import {
  MessagePipelineContext,
  useMessagePipeline,
} from "@foxglove/studio-base/components/MessagePipeline";
import { NumberInput } from "@foxglove/studio-base/components/SettingsTreeEditor/inputs/NumberInput";
import Stack from "@foxglove/studio-base/components/Stack";
import { DataSourceEvent } from "@foxglove/studio-base/context/EventsContext";

const useStyles = makeStyles<void, "eventMetadata" | "eventSelected">()(
  (theme, _params, classes) => ({
    spacer: {
      cursor: "default",
      height: theme.spacing(1),
      gridColumn: "span 2",
    },
    event: {
      display: "contents",
      cursor: "pointer",
      "&:hover": {
        [`.${classes.eventMetadata}`]: {
          backgroundColor: alpha(theme.palette.info.main, theme.palette.action.hoverOpacity),
          borderColor: theme.palette.info.main,
        },
      },
    },
    eventSelected: {
      [`.${classes.eventMetadata}`]: {
        backgroundColor: alpha(theme.palette.info.main, theme.palette.action.activatedOpacity),
        borderColor: theme.palette.info.main,
        boxShadow: `0 0 0 1px ${theme.palette.info.main}`,
      },
    },
    eventHovered: {
      [`.${classes.eventMetadata}`]: {
        backgroundColor: alpha(theme.palette.info.main, theme.palette.action.hoverOpacity),
        borderColor: theme.palette.info.main,
      },
    },
    eventMetadata: {
      padding: theme.spacing(1),
      backgroundColor: theme.palette.background.default,
      borderRight: `1px solid ${theme.palette.divider}`,
      borderBottom: `1px solid ${theme.palette.divider}`,

      "&:nth-of-type(odd)": {
        borderLeft: `1px solid ${theme.palette.divider}`,
      },
      "&:first-of-type": {
        borderTop: `1px solid ${theme.palette.divider}`,
        borderTopLeftRadius: theme.shape.borderRadius,
      },
      "&:nth-of-type(2)": {
        borderTop: `1px solid ${theme.palette.divider}`,
        borderTopRightRadius: theme.shape.borderRadius,
      },
      "&:nth-last-of-type(2)": {
        borderBottomRightRadius: theme.shape.borderRadius,
      },
      "&:nth-last-of-type(3)": {
        borderBottomLeftRadius: theme.shape.borderRadius,
      },
    },
  }),
);

function TimeStampFragment(params: {
  eventId: string;
  label: string;
  setTime: (time: Time) => void;
  setTimeToCursor: () => void;
  setCursorToTime: () => void;
  time: Time;
}): JSX.Element {
  const { classes } = useStyles();
  const { eventId, label, time, setTime, setTimeToCursor, setCursorToTime } = params;
  return (
    <Fragment key={`${eventId}${label}`}>
      <div className={classes.eventMetadata}>{label}</div>
      <div className={classes.eventMetadata}>
        <Stack direction="row">
          <NumberInput
            size="small"
            variant="filled"
            value={toSec(time)}
            fullWidth
            onChange={(value) => {
              try {
                const updatedTime = fromSec(value!);
                setTime(updatedTime);
              } catch {
                noop();
              }
            }}
          />
          <Tooltip title="Move Cursor">
            <Button onClick={setCursorToTime}> Go </Button>
          </Tooltip>
          <Tooltip title="Set from Cursor">
            <Button onClick={setTimeToCursor}> Set </Button>
          </Tooltip>
        </Stack>
      </div>
    </Fragment>
  );
}

function EventViewComponent(params: {
  event: DataSourceEvent;
  filter: string;
  isHovered: boolean;
  isSelected: boolean;
  seek?: ((time: Time) => void);
  updateEvent: (event: DataSourceEvent) => void;
  deleteEvent: (event: DataSourceEvent) => void;
  onHoverStart: (event: DataSourceEvent) => void;
  onHoverEnd: (event: DataSourceEvent) => void;
}): JSX.Element {
  const {
    event,
    filter,
    isHovered,
    isSelected,
    updateEvent,
    deleteEvent,
    seek,
    onHoverStart,
    onHoverEnd,
  } = params;
  const { classes, cx } = useStyles();

  const fields = compact([...Object.entries(event.metadata)]);
  const activeData = useMessagePipeline((ctx: MessagePipelineContext) => {
    return ctx.playerState.activeData;
  });

  return (
    <div
      data-testid="sidebar-event"
      className={cx(classes.event, {
        [classes.eventSelected]: isSelected,
        [classes.eventHovered]: isHovered,
      })}
      onMouseEnter={() => onHoverStart(event)}
      onMouseLeave={() => onHoverEnd(event)}
    >
      {fields.map(([key, value]) => (
        <Fragment key={key}>
          <div className={classes.eventMetadata}>
            <HighlightedText text={key} highlight={filter} />
          </div>
          <div className={classes.eventMetadata}>
            <HighlightedText text={value} highlight={filter} />
          </div>
        </Fragment>
      ))}
      <TimeStampFragment
        eventId={event.id}
        label="Start Time"
        time={event.startTime}
        setTime={(time) => {
          event.startTime = time;
          updateEvent(event);
        }}
        setTimeToCursor={() => {
          if (activeData?.currentTime) {
            event.startTime = activeData.currentTime;
            updateEvent(event);
          }
        }}
        setCursorToTime={() => seek && seek(event.startTime)}
      />
      <TimeStampFragment
        eventId={event.id}
        label="End Time"
        time={event.endTime}
        setTime={(time) => {
          event.endTime = time;
          updateEvent(event);
        }}
        setTimeToCursor={() => {
          if (activeData?.currentTime) {
            event.endTime = activeData.currentTime;
            updateEvent(event);
          }
        }}
        setCursorToTime={() => seek && seek(event.endTime)}
      />
      <Fragment key="eventAction">
        <div className={classes.eventMetadata}></div>
        <div
          className={classes.eventMetadata}
          style={{ display: "flex", flexDirection: "row-reverse" }}
        >
          <Button onClick={() => deleteEvent(event)}>Delete Event</Button>
        </div>
      </Fragment>
      <div className={classes.spacer} />
    </div>
  );
}

export const EventView = React.memo(EventViewComponent);
