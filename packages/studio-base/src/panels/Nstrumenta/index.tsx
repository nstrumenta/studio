// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/
//
// This file incorporates work covered by the following copyright and
// permission notice:
//
//   Copyright 2019-2021 Cruise LLC
//
//   This source code is licensed under the Apache License, Version 2.0,
//   found at http://www.apache.org/licenses/LICENSE-2.0
//   You may not use this file except in compliance with the License.

import ClearIcon from "@mui/icons-material/Clear";
import SearchIcon from "@mui/icons-material/Search";
import { Button, CircularProgress, IconButton, TextField, Typography } from "@mui/material";
import { useCallback, useEffect, useMemo, useRef } from "react";
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
  TimelineInteractionStateStore,
  useTimelineInteractionState,
} from "@foxglove/studio-base/context/TimelineInteractionStateContext";
import { useAppTimeFormat } from "@foxglove/studio-base/hooks";

import { EventView } from "@foxglove/studio-base/components/DataSourceSidebar/EventView";

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
const selectSetEvents = (store: EventsStore) => store.setEvents;
const selectEventFilter = (store: EventsStore) => store.filter;
const selectSetEventFilter = (store: EventsStore) => store.setFilter;
const selectEvents = (store: EventsStore) => store.events;
const selectHoveredEvent = (store: TimelineInteractionStateStore) => store.hoveredEvent;
const selectSetHoveredEvent = (store: TimelineInteractionStateStore) => store.setHoveredEvent;
const selectEventsAtHoverValue = (store: TimelineInteractionStateStore) => store.eventsAtHoverValue;
const selectSelectedEventId = (store: EventsStore) => store.selectedEventId;
const selectSelectEvent = (store: EventsStore) => store.selectEvent;

import Panel from "@foxglove/studio-base/components/Panel";
import PanelToolbar from "@foxglove/studio-base/components/PanelToolbar";
import { SaveConfig } from "@foxglove/studio-base/types/panels";

import { NstrumentaBrowserClient } from "nstrumenta/dist/browser/client";
import { useNstrumentaSettings } from "./settings";
import { NstrumentaConfig } from "./types";

type Props = {
  config: NstrumentaConfig;
  saveConfig: SaveConfig<NstrumentaConfig>;
};

function NstrumentaPanel(props: Props): JSX.Element {
  const { config, saveConfig } = props;
  const { labelsDataId } = config;

  const { search } = window.location;
  const apiKeyParam = new URLSearchParams(search).get("apiKey");
  const apiLocalStore = localStorage.getItem("apiKey");
  const apiKey = apiKeyParam
    ? apiKeyParam
    : apiLocalStore
    ? apiLocalStore
    : prompt("Enter your nstrumenta apiKey");
  if (apiKey) {
    localStorage.setItem("apiKey", apiKey);
  }
  const nstClient = useRef(new NstrumentaBrowserClient(apiKey!));

  const labelDataIdParam = new URLSearchParams(search).get("labelsDataId");
  if (labelDataIdParam) {
    saveConfig((draft) => {
      draft.labelsDataId = labelDataIdParam;
      return draft;
    });
  }

  useNstrumentaSettings(config, saveConfig);

  const events = useEvents(selectEvents);
  const selectedEventId = useEvents(selectSelectedEventId);
  const selectEvent = useEvents(selectSelectEvent);
  const setEvents = useEvents(selectSetEvents);
  const { formatTime } = useAppTimeFormat();
  const seek = useMessagePipeline(selectSeek);
  const eventsAtHoverValue = useTimelineInteractionState(selectEventsAtHoverValue);
  const hoveredEvent = useTimelineInteractionState(selectHoveredEvent);
  const setHoveredEvent = useTimelineInteractionState(selectSetHoveredEvent);
  const filter = useEvents(selectEventFilter);
  const setFilter = useEvents(selectSetEventFilter);

  const timestampedEvents = useMemo(
    () =>
      (events.value ?? []).map((event) => {
        return { ...event, formattedTime: formatTime(event.startTime) };
      }),
    [events, formatTime],
  );

  const loadLabels = async (dataId: string) => {
    console.log("loading events from", labelsDataId);
    const query = await nstClient.current.storage.query({
      field: "dataId",
      comparison: "==",
      compareValue: dataId,
    });
    console.log(query);
    if (query[0] === undefined) return;
    const url = await nstClient.current.storage.getDownloadUrl(query[0].filePath);
    fetch(url).then(async (res) => {
      setEvents({ loading: false, value: await res.json() });
    });
  };

  const saveLabels = async () => {
    const serializedEvents = JSON.stringify(events.value);
    console.log(serializedEvents);

    if (serializedEvents) {
      const data = new Blob([serializedEvents], {
        type: "application/json",
      });
      nstClient.current.storage.upload({
        dataId: labelsDataId ? labelsDataId : undefined,
        data,
        filename: "labels.json",
        meta: {},
        overwrite: true,
      });
    }
  };

  useEffect(() => {
    if (labelsDataId) {
      loadLabels(labelsDataId);
    }
  }, [labelsDataId]);

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
    <Stack fullHeight>
      <PanelToolbar />
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
        {timestampedEvents.map((event) => {
          return (
            <EventView
              key={event.id}
              event={event}
              filter={filter}
              formattedTime={event.formattedTime}
              // When hovering within the event list only show hover state on directly
              // hovered event.
              isHovered={
                hoveredEvent
                  ? event.id === hoveredEvent.id
                  : eventsAtHoverValue[event.id] != undefined
              }
              isSelected={event.id === selectedEventId}
              onClick={onClick}
              onHoverStart={onHoverStart}
              onHoverEnd={onHoverEnd}
            />
          );
        })}
      </div>
      <Button onClick={saveLabels}>Save Events</Button>
    </Stack>
  );
}

const defaultConfig: NstrumentaConfig = {
  labelsDataId: "",
};

export default Panel(
  Object.assign(NstrumentaPanel, {
    panelType: "nstrumenta",
    defaultConfig,
  }),
);
