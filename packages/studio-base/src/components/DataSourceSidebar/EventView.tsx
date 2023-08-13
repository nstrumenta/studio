// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { alpha } from "@mui/material";
import { compact, noop } from "lodash";
import { Fragment } from "react";
import { makeStyles } from "tss-react/mui";

import { fromSec, toSec } from "@foxglove/rostime";
import { HighlightedText } from "@foxglove/studio-base/components/HighlightedText";
import {
  MessagePipelineContext,
  useMessagePipeline,
} from "@foxglove/studio-base/components/MessagePipeline";
import { NumberInput } from "@foxglove/studio-base/components/SettingsTreeEditor/inputs/NumberInput";
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

function EventViewComponent(params: {
  event: DataSourceEvent;
  filter: string;
  isHovered: boolean;
  isSelected: boolean;
  onClick: (event: DataSourceEvent) => void;
  onHoverStart: (event: DataSourceEvent) => void;
  onHoverEnd: (event: DataSourceEvent) => void;
}): JSX.Element {
  const { event, filter, isHovered, isSelected, onClick, onHoverStart, onHoverEnd } = params;
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
      onClick={() => onClick(event)}
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
      <Fragment key={`${event.id}-startTime`}>
        <div className={classes.eventMetadata}>Start Time:</div>

        <div className={classes.eventMetadata}>
          <NumberInput
            size="small"
            variant="filled"
            value={toSec(event.startTime)}
            placeholder="start time"
            fullWidth
            onChange={(value) => {
              try {
                event.startTime = fromSec(value!);
              } catch {
                noop();
              }
            }}
          />
        </div>
      </Fragment>
      <Fragment key={`${event.id}-endTime`}>
        <div className={classes.eventMetadata}>End Time:</div>
        <div className={classes.eventMetadata}>
          <NumberInput
            size="small"
            variant="filled"
            value={toSec(event.endTime)}
            placeholder="end time"
            fullWidth
            onChange={(value) => {
              try {
                event.endTime = fromSec(value!);
              } catch {
                noop();
              }
            }}
          />
        </div>
      </Fragment>
      <div className={classes.spacer} />
    </div>
  );
}

export const EventView = React.memo(EventViewComponent);
