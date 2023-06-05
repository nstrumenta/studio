// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import Stack from "@foxglove/studio-base/components/Stack";
import { useNstrumentaContext } from "@foxglove/studio-base/context/NstrumentaContext";

import { JSONTextEditor } from "material-jsoneditor";

export function ExperimentTab(): JSX.Element {
  const { experiment, setExperiment } = useNstrumentaContext();

  return (
    <Stack gap={2} justifyContent="flex-start" flex="auto" fullHeight>
      <JSONTextEditor
        value={experiment || {}}
        onChange={setExperiment !== undefined ? setExperiment : () => {}}
      />
    </Stack>
  );
}
