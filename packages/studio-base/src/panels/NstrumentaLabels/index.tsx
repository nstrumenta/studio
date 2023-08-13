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

import { Button } from "@mui/material";
import { useCallback, useEffect } from "react";

import { EventsList } from "@foxglove/studio-base/components/DataSourceSidebar/EventsList";
import Panel from "@foxglove/studio-base/components/Panel";
import PanelToolbar from "@foxglove/studio-base/components/PanelToolbar";
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
import { SaveConfig } from "@foxglove/studio-base/types/panels";

import { useNstrumentaSettings } from "./settings";
import { NstrumentaConfig } from "./types";

const selectSetEvents = (store: EventsStore) => store.setEvents;

const selectEvents = (store: EventsStore) => store.events;
const selectSetDeviceId = (store: EventsStore) => store.setDeviceId;

type Props = {
  config: NstrumentaConfig;
  saveConfig: SaveConfig<NstrumentaConfig>;
};

function NstrumentaPanel(props: Props): JSX.Element {
  const { config, saveConfig } = props;

  const nstClient = useNstrumentClient();

  useNstrumentaSettings(config, saveConfig);

  const { experiment } = useNstrumentaContext();

  const events = useEvents(selectEvents);

  const setEvents = useEvents(selectSetEvents);
  const setDeviceId = useEvents(selectSetDeviceId);

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

  return (
    <Stack fullHeight>
      <PanelToolbar />
      <EventsList />
      <Button onClick={saveLabels}>Save Events</Button>
    </Stack>
  );
}

const defaultConfig: NstrumentaConfig = {};

export default Panel(
  Object.assign(NstrumentaPanel, {
    panelType: "nstrumentaLabels",
    defaultConfig,
  }),
);
