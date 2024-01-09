// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import {
  usePlayerSelection
} from "@foxglove/studio-base/context/PlayerSelectionContext";
import { useCallback } from "react";

export function useOpenExperiment(): () => Promise<void> {
  const { selectSource } = usePlayerSelection();



  return useCallback(async () => {
    selectSource("nstrumenta", { type: "nstrumenta", params: { filePath: "projects/peek-ai-2023/data/recording-f1bf24c7-100d-42a5-84d1-3aa8c9a104ce.mcap" } });
  }, [selectSource]);
}
