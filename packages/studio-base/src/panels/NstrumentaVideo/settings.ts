// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import produce from "immer";
import { set } from "lodash";
import { useCallback, useEffect } from "react";

import { SettingsTreeAction, SettingsTreeNodes } from "@foxglove/studio";
import {
  NstrumentaVideo,
  useNstrumentaContext,
} from "@foxglove/studio-base/context/NstrumentaContext";
import { usePanelSettingsTreeUpdate } from "@foxglove/studio-base/providers/PanelStateContextProvider";
import { SaveConfig } from "@foxglove/studio-base/types/panels";

export type NstrumentaVideoConfig = {
  videoName?: string;
};

function buildSettingsTree(
  config: NstrumentaVideoConfig,
  videos: NstrumentaVideo[],
): SettingsTreeNodes {
  return {
    general: {
      fields: {
        videoName: {
          label: "Video Name",
          input: "select",
          options: videos.map((v) => {
            return { label: v.name, value: v.name };
          }),
          value: config.videoName,
        },
      },
    },
  };
}

export function useNstrumentaVideoSettings(
  config: NstrumentaVideoConfig,
  saveConfig: SaveConfig<NstrumentaVideoConfig>,
): void {
  const updatePanelSettingsTree = usePanelSettingsTreeUpdate();

  const { experiment } = useNstrumentaContext();

  const actionHandler = useCallback(
    (action: SettingsTreeAction) => {
      if (action.action !== "update") {
        return;
      }

      saveConfig(
        produce<NstrumentaVideoConfig>((draft) => {
          const path = action.payload.path.slice(1);
          set(draft, path, action.payload.value);
        }),
      );
    },
    [saveConfig],
  );

  useEffect(() => {
    updatePanelSettingsTree({
      actionHandler,
      nodes: buildSettingsTree(config, experiment?.videos ?? []),
    });
  }, [actionHandler, config, experiment?.videos, updatePanelSettingsTree]);
}
