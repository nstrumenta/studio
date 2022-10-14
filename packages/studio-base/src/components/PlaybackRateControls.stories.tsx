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
import { storiesOf } from "@storybook/react";

import MockMessagePipelineProvider from "@foxglove/studio-base/components/MessagePipeline/MockMessagePipelineProvider";
import PlaybackRateControls from "@foxglove/studio-base/components/PlaybackRateControls";
import MockCurrentLayoutProvider from "@foxglove/studio-base/providers/CurrentLayoutProvider/MockCurrentLayoutProvider";

const CAPABILITIES = ["setPlaybackRate", "playbackControl"];

function ControlsStory() {
  return (
    <div
      style={{ padding: 20, paddingTop: 300 }}
      ref={(el) => {
        setImmediate(() => {
          if (el) {
            (el as any).querySelector("[data-testid=PlaybackRateControls-Dropdown]").click();
          }
        });
      }}
    >
      <PlaybackRateControls />
    </div>
  );
}

storiesOf("components/PlaybackRateControls", module)
  .add(
    "without rate capability",
    () => {
      return (
        <MockCurrentLayoutProvider>
          <MockMessagePipelineProvider>
            <ControlsStory />
          </MockMessagePipelineProvider>
        </MockCurrentLayoutProvider>
      );
    },
    { colorScheme: "dark" },
  )
  .add(
    "without a rate from the player",
    () => {
      return (
        <MockCurrentLayoutProvider>
          <MockMessagePipelineProvider
            capabilities={CAPABILITIES}
            activeData={{ playbackRate: undefined }}
          >
            <ControlsStory />
          </MockMessagePipelineProvider>
        </MockCurrentLayoutProvider>
      );
    },
    { colorScheme: "dark" },
  )
  .add(
    "with a rate",
    () => {
      return (
        <MockCurrentLayoutProvider>
          <MockMessagePipelineProvider capabilities={CAPABILITIES}>
            <ControlsStory />
          </MockMessagePipelineProvider>
        </MockCurrentLayoutProvider>
      );
    },
    { colorScheme: "dark" },
  )
  .add(
    "with a very small rate",
    () => {
      return (
        <MockCurrentLayoutProvider>
          <MockMessagePipelineProvider
            capabilities={CAPABILITIES}
            activeData={{ playbackRate: 0.01 }}
          >
            <ControlsStory />
          </MockMessagePipelineProvider>
        </MockCurrentLayoutProvider>
      );
    },
    { colorScheme: "dark" },
  );
