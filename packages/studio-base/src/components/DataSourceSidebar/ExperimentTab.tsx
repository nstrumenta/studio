// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import Button from "@mui/material/Button";
import { JSONTextEditor } from "material-jsoneditor";

import {
  MessagePipelineContext,
  useMessagePipeline,
} from "@foxglove/studio-base/components/MessagePipeline";
import Stack from "@foxglove/studio-base/components/Stack";
import {
  NstrumentaExperiment,
  useNstrumentaContext,
} from "@foxglove/studio-base/context/NstrumentaContext";

export function ExperimentTab(): JSX.Element {
  const { experiment, setExperiment, saveExperiment } = useNstrumentaContext();

  useMessagePipeline((ctx: MessagePipelineContext) => {
    return ctx.playerState.activeData;
  });

  return (
    <Stack flex="auto" fullHeight>
      <Button
        style={{ width: "fit-content", margin: "2px" }}
        variant="contained"
        color="inherit"
        title="Save Experiment to nstrumenta"
        onClick={saveExperiment}
      >
        Save
      </Button>
      <Stack gap={2} justifyContent="flex-start" flex="auto" fullHeight>
        <JSONTextEditor
          value={experiment != undefined ? experiment : {}}
          onChange={
            setExperiment != undefined
              ? (val) => {
                  setExperiment(val as NstrumentaExperiment);
                }
              : () => {}
          }
        />
      </Stack>
    </Stack>
  );
}
