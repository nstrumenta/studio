// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import produce from "immer";
import { set } from "lodash";
import { useCallback, useEffect } from "react";

import { SettingsTreeAction, SettingsTreeNodes } from "@foxglove/studio";
import { usePanelSettingsTreeUpdate } from "@foxglove/studio-base/providers/PanelStateContextProvider";
import { SaveConfig } from "@foxglove/studio-base/types/panels";

import { NstrumentaConfig } from "./types";

function buildSettingsTree(): SettingsTreeNodes {
  return {
    general: {
      label: "Labels",
      fields: {},
    },
  };
}

export function useNstrumentaSettings(
  config: NstrumentaConfig,
  saveConfig: SaveConfig<NstrumentaConfig>,
): void {
  const updatePanelSettingsTree = usePanelSettingsTreeUpdate();

  const actionHandler = useCallback(
    (action: SettingsTreeAction) => {
      if (action.action !== "update") {
        return;
      }

      saveConfig(
        produce<NstrumentaConfig>((draft) => {
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
      nodes: buildSettingsTree(),
    });
  }, [actionHandler, config, updatePanelSettingsTree]);
}
