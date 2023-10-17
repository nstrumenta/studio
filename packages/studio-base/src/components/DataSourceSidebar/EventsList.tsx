// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import ClearIcon from "@mui/icons-material/Clear";
import SearchIcon from "@mui/icons-material/Search";
import { AppBar, Button, CircularProgress, IconButton, TextField, Typography } from "@mui/material";
import { useCallback, useEffect, useMemo } from "react";
import { makeStyles } from "tss-react/mui";

import {
  MessagePipelineContext,
  useMessagePipeline,
} from "@foxglove/studio-base/components/MessagePipeline";
import Stack from "@foxglove/studio-base/components/Stack";
import {
  DataSourceEvent,
  EventsStore,
  useEvents,
} from "@foxglove/studio-base/context/EventsContext";
import {
  NstrumentaLabels,
  useNstrumentClient,
  useNstrumentaContext,
} from "@foxglove/studio-base/context/NstrumentaContext";
import {
  TimelineInteractionStateStore,
  useTimelineInteractionState,
} from "@foxglove/studio-base/context/TimelineInteractionStateContext";
import { useAppTimeFormat } from "@foxglove/studio-base/hooks";
import { useConfirm } from "@foxglove/studio-base/hooks/useConfirm";

import { EventView } from "./EventView";

const useStyles = makeStyles()((theme) => ({
  appBar: {
    top: -1,
    zIndex: theme.zIndex.appBar - 1,
    display: "flex",
    flexDirection: "row",
    padding: theme.spacing(1),
    gap: theme.spacing(1),
    alignItems: "center",
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  saveLabelsButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    marginBottom: theme.spacing(4),
    marginRight: theme.spacing(1),
  },
  grid: {
    display: "grid",
    flexShrink: 1,
    gridTemplateColumns: "auto 1fr",
    overflowY: "auto",
    padding: theme.spacing(1),
  },
  root: {
    backgroundColor: theme.palette.background.paper,
    maxHeight: "100%",
  },
}));

const selectSeek = (ctx: MessagePipelineContext) => ctx.seekPlayback;
const selectEventFilter = (store: EventsStore) => store.filter;
const selectSetEventFilter = (store: EventsStore) => store.setFilter;
const selectEvents = (store: EventsStore) => store.events;
const selectSetDeviceId = (store: EventsStore) => store.setDeviceId;
const selectSetEvents = (store: EventsStore) => store.setEvents;
const selectHoveredEvent = (store: TimelineInteractionStateStore) => store.hoveredEvent;
const selectSetHoveredEvent = (store: TimelineInteractionStateStore) => store.setHoveredEvent;
const selectEventsAtHoverValue = (store: TimelineInteractionStateStore) => store.eventsAtHoverValue;
const selectSelectedEventId = (store: EventsStore) => store.selectedEventId;
const selectSelectEvent = (store: EventsStore) => store.selectEvent;

export function EventsList(): JSX.Element {
  const events = useEvents(selectEvents);
  const selectedEventId = useEvents(selectSelectedEventId);
  const setEvents = useEvents(selectSetEvents);
  const setDeviceId = useEvents(selectSetDeviceId);
  const selectEvent = useEvents(selectSelectEvent);
  const { formatTime } = useAppTimeFormat();
  const seek = useMessagePipeline(selectSeek);
  const eventsAtHoverValue = useTimelineInteractionState(selectEventsAtHoverValue);
  const hoveredEvent = useTimelineInteractionState(selectHoveredEvent);
  const setHoveredEvent = useTimelineInteractionState(selectSetHoveredEvent);
  const filter = useEvents(selectEventFilter);
  const setFilter = useEvents(selectSetEventFilter);
  const [confirm, confirmModal] = useConfirm();

  const nstClient = useNstrumentClient();

  const { experiment } = useNstrumentaContext();

  const loadLabels = useCallback(
    async (labelFiles: NstrumentaLabels[]) => {
      let fetchedEvents: DataSourceEvent[] = [];
      for (const labelFile of labelFiles) {
        try {
          const url = await nstClient.storage.getDownloadUrl(labelFile.filePath);
          await fetch(url).then(async (res) => {
            //merge and attach filePath to items
            fetchedEvents = [
              ...fetchedEvents,
              ...(await res.json()).events.map((item: Record<string, unknown>) => {
                return { ...item, deviceId: labelFile.filePath };
              }),
            ];
          });
        } catch (err) {
          await nstClient.storage.upload({
            filename: labelFile.filePath.split("/").slice(2).join("/"),
            data: new Blob(['{"events":[]}']),
            meta: {},
            overwrite: true,
          });
        }
      }
      setEvents({ loading: false, value: fetchedEvents });
    },
    [nstClient.storage, setEvents],
  );

  const updateEvent = useCallback(
    async (updatedEvent: DataSourceEvent) => {
      if (events.value) {
        const eventsWithoutUpdatedEvent = events.value.filter(
          (event) => event.id != updatedEvent.id,
        );
        setEvents({ loading: false, value: [...eventsWithoutUpdatedEvent, updatedEvent] });
      }
    },
    [setEvents, events],
  );

  const deleteEvent = useCallback(
    async (updatedEvent: DataSourceEvent) => {
      void confirm({
        title: "Are you sure you want to delete event?",
        ok: "Delete Event",
      }).then((response) => {
        if (response === "ok") {
          if (events.value) {
            const eventsWithoutUpdatedEvent = events.value.filter(
              (event) => event.id !== updatedEvent.id,
            );
            setEvents({ loading: false, value: [...eventsWithoutUpdatedEvent] });
          }
        }
      });
    },
    [confirm, setEvents, events],
  );

  const saveLabels = async () => {
    if (experiment?.labelFiles == undefined) {
      console.error("no labelFiles in experiment");
      return;
    }
    for (const labelFile of experiment.labelFiles) {
      const serializedEvents = JSON.stringify({
        events: events.value?.filter((v) => v.collection === labelFile.filePath),
      });

      if (serializedEvents) {
        const data = new Blob([serializedEvents], {
          type: "application/json",
        });
        await nstClient.storage.upload({
          filename: labelFile.filePath.split("/").slice(3).join("/"),
          data,
          meta: {},
          overwrite: true,
        });
      }
    }
  };

  useEffect(() => {
    if (experiment?.labelFiles && experiment.labelFiles[0]?.filePath) {
      setDeviceId(experiment.labelFiles[0].filePath);
      void loadLabels(experiment.labelFiles);
    }
  }, [experiment?.labelFiles, loadLabels, setDeviceId]);

  const timestampedEvents = useMemo(
    () =>
      (events.value ?? [])
        .filter((event) => {
          if (filter) {
            let valuesConcatString = "";
            for (const [, value] of Object.entries(event)) {
              valuesConcatString += `;${JSON.stringify(value)}`;
            }
            if (valuesConcatString.match(new RegExp(filter))) {
              return event;
            }
            // filter out non matches
            return;
          }
          return event;
        })
        .map((event) => {
          return { ...event, formattedTime: formatTime(event.startTime) };
        }),
    [events, formatTime, filter],
  );

  const clearFilter = useCallback(() => {
    setFilter("");
  }, [setFilter]);

  const onClick = useCallback(
    (event: DataSourceEvent) => {
      if (event.id === selectedEventId) {
        selectEvent(undefined);
      } else {
        selectEvent(event.id);
      }

      if (seek) {
        seek(event.startTime);
      }
    },
    [seek, selectEvent, selectedEventId],
  );

  const onHoverEnd = useCallback(() => {
    setHoveredEvent(undefined);
  }, [setHoveredEvent]);

  const onHoverStart = useCallback(
    (event: DataSourceEvent) => {
      setHoveredEvent(event);
    },
    [setHoveredEvent],
  );

  const { classes } = useStyles();

  return (
    <Stack className={classes.root} fullHeight>
      <AppBar className={classes.appBar} position="sticky" color="inherit" elevation={0}>
        <TextField
          variant="filled"
          fullWidth
          value={filter}
          onChange={(event) => setFilter(event.currentTarget.value)}
          placeholder="Search by key, value, or key:value"
          InputProps={{
            startAdornment: <SearchIcon fontSize="small" />,
            endAdornment: filter !== "" && (
              <IconButton edge="end" onClick={clearFilter} size="small">
                <ClearIcon fontSize="small" />
              </IconButton>
            ),
          }}
        />
      </AppBar>
      {events.loading && (
        <Stack flex="auto" padding={2} fullHeight alignItems="center" justifyContent="center">
          <CircularProgress />
        </Stack>
      )}
      {events.error && (
        <Stack flex="auto" padding={2} fullHeight alignItems="center" justifyContent="center">
          <Typography align="center" color="error">
            Error loading events.
          </Typography>
        </Stack>
      )}
      {events.value && events.value.length === 0 && (
        <Stack flex="auto" padding={2} fullHeight alignItems="center" justifyContent="center">
          <Typography align="center" color="text.secondary">
            No Events
          </Typography>
        </Stack>
      )}
      <div className={classes.grid}>
        {timestampedEvents
          .sort((a, b) => (a.id < b.id ? 1 : -1))
          .map((event) => {
            return (
              <EventView
                key={event.id}
                event={event}
                filter={filter}
                // When hovering within the event list only show hover state on directly
                // hovered event.
                isHovered={
                  hoveredEvent
                    ? event.id === hoveredEvent.id
                    : eventsAtHoverValue[event.id] != undefined
                }
                updateEvent={updateEvent}
                deleteEvent={deleteEvent}
                isSelected={event.id === selectedEventId}
                onClick={onClick}
                onHoverStart={onHoverStart}
                onHoverEnd={onHoverEnd}
              />
            );
          })}
      </div>
      <Button
        className={classes.saveLabelsButton}
        variant="contained"
        color="inherit"
        title="(shortcut: double-click)"
        onClick={saveLabels}
      >
        Save
      </Button>
      {confirmModal}
    </Stack>
  );
}
