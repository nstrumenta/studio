// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import {
  Alert,
  Button,
  ButtonGroup,
  CircularProgress,
  Dialog,
  DialogActions,
  FormControl,
  FormLabel,
  IconButton,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { countBy } from "lodash";
import { KeyboardEvent, useCallback, useMemo } from "react";
import { useAsyncFn } from "react-use";
import { keyframes } from "tss-react";
import { makeStyles } from "tss-react/mui";
import { useImmer } from "use-immer";
import { v4 as uuidv4 } from "uuid";

import Log from "@foxglove/log";
import { add, fromNanoSec, fromSec } from "@foxglove/rostime";
import { Time } from "@foxglove/studio";
import {
  MessagePipelineContext,
  useMessagePipeline,
} from "@foxglove/studio-base/components/MessagePipeline";
import Stack from "@foxglove/studio-base/components/Stack";
import { EventsStore, useEvents } from "@foxglove/studio-base/context/EventsContext";
import { useAppTimeFormat } from "@foxglove/studio-base/hooks";

const log = Log.getLogger(__filename);

const fadeInAnimation = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

const useStyles = makeStyles<void, "toggleButton">()((theme, _params, classes) => ({
  grid: {
    alignItems: "center",
    display: "grid",
    gridTemplateColumns: "1fr 1fr auto",
    gap: theme.spacing(1),
    overflow: "auto",
    alignContent: "flex-start",
  },
  row: {
    animation: `${fadeInAnimation} 0.2s ease-in-out`,
    display: "contents",
  },
  toggleButton: {
    border: "none",
    lineHeight: 1,
  },
  toggleButtonGroup: {
    marginRight: theme.spacing(-1),
    gap: theme.spacing(0.25),

    [`.${classes.toggleButton}`]: {
      borderRadius: `${theme.shape.borderRadius}px !important`,
      marginLeft: "0px !important",
      borderLeft: "none !important",
    },
  },
}));

type KeyValue = { key: string; value: string };

const selectCurrentTime = (ctx: MessagePipelineContext) => ctx.playerState.activeData?.currentTime;
const selectRefreshEvents = (store: EventsStore) => store.refreshEvents;
const selectDeviceId = (store: EventsStore) => store.deviceId;

export function CreateEventDialog(props: { onClose: () => void }): JSX.Element {
  const { onClose } = props;

  const { classes } = useStyles();
  const events = useEvents((store: EventsStore) => store.events);

  const { formatTime } = useAppTimeFormat();
  const timestampedEvents = useMemo(
    () =>
      (events.value ?? []).map((event) => {
        return event;
      }),
    [events],
  );
  const setEvents = useEvents((store: EventsStore) => store.setEvents);
  const refreshEvents = useEvents(selectRefreshEvents);
  const currentTime = useMessagePipeline(selectCurrentTime);
  const [event, setEvent] = useImmer<{
    startTime: undefined | Time;
    duration: undefined | number;
    durationUnit: "sec" | "nsec";
    metadataEntries: KeyValue[];
  }>({
    startTime: currentTime,
    duration: 0,
    durationUnit: "sec",
    metadataEntries: [{ key: "", value: "" }],
  });

  const updateMetadata = useCallback(
    (index: number, updateType: keyof KeyValue, value: string) => {
      setEvent((draft) => {
        const keyval = draft.metadataEntries[index];
        if (keyval) {
          keyval[updateType] = value;

          // Automatically add new row if we're at the end and have both key and value.
          if (
            index === draft.metadataEntries.length - 1 &&
            keyval.key.length > 0 &&
            keyval.value.length > 0
          ) {
            draft.metadataEntries.push({ key: "", value: "" });
          }
        }
      });
    },
    [setEvent],
  );

  const countedMetadata = countBy(event.metadataEntries, (kv) => kv.key);
  const duplicateKey = Object.entries(countedMetadata).find(
    ([key, count]) => key.length > 0 && count > 1,
  );
  const canSubmit = event.startTime != undefined && event.duration != undefined && !duplicateKey;

  const collection = useEvents(selectDeviceId) ?? "web";

  const [createdEvent, createEvent] = useAsyncFn(async () => {
    if (event.startTime == undefined || event.duration == undefined) {
      return;
    }

    const duration: Time =
      event.durationUnit === "sec" ? fromSec(event.duration) : fromNanoSec(BigInt(event.duration));
    const { startTime, metadataEntries } = event;
    const metadata: Record<string, string> = {};
    metadataEntries.forEach((entry) => (metadata[entry.key] = entry.value));
    const id = uuidv4();
    setEvents({
      loading: false,
      value: [
        ...timestampedEvents,
        {
          id,
          endTime: add(startTime, duration),
          startTime,
          metadata,
          collection,
        },
      ],
    });

    onClose();
    refreshEvents();
  }, [collection, event, onClose, refreshEvents, setEvents, timestampedEvents]);

  const onMetaDataKeyDown = useCallback(
    (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === "Enter") {
        createEvent().catch((error) => log.error(error));
      }
    },
    [createEvent],
  );

  const addRow = useCallback(
    (index: number) => {
      setEvent((draft) => {
        draft.metadataEntries.splice(index + 1, 0, { key: "", value: "" });
      });
    },
    [setEvent],
  );

  const removeRow = useCallback(
    (index: number) => {
      setEvent((draft) => {
        if (draft.metadataEntries.length > 1) {
          draft.metadataEntries.splice(index, 1);
        }
      });
    },
    [setEvent],
  );

  const formattedStartTime = currentTime ? formatTime(currentTime) : "-";

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <Stack paddingX={3} paddingTop={2}>
        <Typography variant="h2">Create event</Typography>
      </Stack>
      <Stack paddingX={3} paddingTop={2}>
        <div className={classes.grid}>
          <FormControl>
            <FormLabel>Start Time</FormLabel>
            <Typography paddingY={1}>{formattedStartTime}</Typography>
          </FormControl>
          <TextField
            value={event.duration ?? ""}
            fullWidth
            label="Duration"
            onChange={(ev) => {
              const duration = Number(ev.currentTarget.value);
              setEvent((oldEvent) => ({
                ...oldEvent,
                duration: duration > 0 ? duration : undefined,
              }));
            }}
            type="number"
            InputProps={{
              endAdornment: (
                <ToggleButtonGroup
                  className={classes.toggleButtonGroup}
                  size="small"
                  exclusive
                  value={event.durationUnit}
                  onChange={(_ev, durationUnit) => {
                    if (event.durationUnit !== durationUnit) {
                      setEvent((old) => ({ ...old, durationUnit }));
                    }
                  }}
                >
                  <ToggleButton className={classes.toggleButton} tabIndex={-1} value="sec">
                    sec
                  </ToggleButton>
                  <ToggleButton className={classes.toggleButton} tabIndex={-1} value="nsec">
                    nsec
                  </ToggleButton>
                </ToggleButtonGroup>
              ),
            }}
          />
          <ButtonGroup style={{ visibility: "hidden" }}>
            <IconButton tabIndex={-1} data-testid="add">
              <AddIcon />
            </IconButton>
            <IconButton tabIndex={-1}>
              <AddIcon />
            </IconButton>
          </ButtonGroup>
        </div>
      </Stack>
      <Stack paddingX={3} paddingTop={2}>
        <FormLabel>Metadata</FormLabel>
        <div className={classes.grid}>
          {event.metadataEntries.map(({ key, value }, index) => {
            const hasDuplicate = ((key.length > 0 ? countedMetadata[key] : undefined) ?? 0) > 1;
            return (
              <div className={classes.row} key={index}>
                <TextField
                  fullWidth
                  value={key}
                  autoFocus={index === 0}
                  placeholder="Key (string)"
                  error={hasDuplicate}
                  onKeyDown={onMetaDataKeyDown}
                  onChange={(evt) => updateMetadata(index, "key", evt.currentTarget.value)}
                />
                <TextField
                  fullWidth
                  value={value}
                  placeholder="Value (string)"
                  error={hasDuplicate}
                  onKeyDown={onMetaDataKeyDown}
                  onChange={(evt) => updateMetadata(index, "value", evt.currentTarget.value)}
                />
                <ButtonGroup>
                  <IconButton tabIndex={-1} onClick={() => addRow(index)}>
                    <AddIcon />
                  </IconButton>
                  <IconButton
                    tabIndex={-1}
                    onClick={() => removeRow(index)}
                    style={{ visibility: event.metadataEntries.length > 1 ? "visible" : "hidden" }}
                  >
                    <RemoveIcon />
                  </IconButton>
                </ButtonGroup>
              </div>
            );
          })}
        </div>
      </Stack>
      <DialogActions>
        <Button variant="outlined" size="large" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="contained"
          size="large"
          onClick={createEvent}
          disabled={!canSubmit || createdEvent.loading}
        >
          {createdEvent.loading && (
            <CircularProgress color="inherit" size="1rem" style={{ marginRight: "0.5rem" }} />
          )}
          Create Event
        </Button>
      </DialogActions>
      {duplicateKey && <Alert severity="error">Duplicate key {duplicateKey[0]}</Alert>}
      {createdEvent.error?.message && <Alert severity="error">{createdEvent.error.message}</Alert>}
    </Dialog>
  );
}
