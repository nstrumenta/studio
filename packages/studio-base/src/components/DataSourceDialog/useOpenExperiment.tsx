// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import {
  usePlayerSelection
} from "@foxglove/studio-base/context/PlayerSelectionContext";
import { useCallback } from "react";

export function useOpenExperiment(): (filePath: string) => Promise<void> {
  const { selectSource } = usePlayerSelection();

  return useCallback(async (filePath: string) => {
    selectSource("nstrumenta", { type: "nstrumenta", params: { filePath } });
  }, [selectSource]);
}
