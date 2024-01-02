// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { action } from "@storybook/addon-actions";
import { StoryObj } from "@storybook/react";

import { AppBar } from "@foxglove/studio-base/components/AppBar";
import { StorybookDecorator } from "@foxglove/studio-base/components/AppBar/StorybookDecorator.stories";
import MockMessagePipelineProvider from "@foxglove/studio-base/components/MessagePipeline/MockMessagePipelineProvider";
import Stack from "@foxglove/studio-base/components/Stack";
import { PlayerPresence } from "@foxglove/studio-base/players/types";

export default {
  title: "components/AppBar",
  component: AppBar,
  decorators: [StorybookDecorator],
  parameters: {
    colorScheme: "both-column",
  },
  excludeStories: ["Wrapper"],
};

const actions = {
  signIn: action("signIn"),
  onSelectDataSourceAction: action("onSelectDataSourceAction"),
  onMinimizeWindow: action("onMinimizeWindow"),
  onMaximizeWindow: action("onMaximizeWindow"),
  onUnmaximizeWindow: action("onUnmaximizeWindow"),
  onCloseWindow: action("onCloseWindow"),
  prefsDialogOpen: false,
  setPrefsDialogOpen: action("setPrefsDialogOpen"),
};

export const Default: StoryObj = {
  render: () => {
    return <AppBar {...actions} />;
  },
};

export const DefaultChinese: StoryObj = { ...Default, parameters: { forceLanguage: "zh" } };

export const CustomWindowControls: StoryObj = {
  render: () => {
    return <AppBar showCustomWindowControls {...actions} />;
  },
};

export const CustomWindowControlsMaximized: StoryObj = {
  render: () => {
    return <AppBar showCustomWindowControls isMaximized {...actions} />;
  },
};

export const CustomWindowControlsDragRegion: StoryObj = {
  render: () => {
    return <AppBar showCustomWindowControls debugDragRegion {...actions} />;
  },
};

function LabeledAppBar({ label }: React.PropsWithChildren<{ label: string }>) {
  return (
    <>
      <div style={{ padding: 8 }}>{label}</div>
      <div>
        <AppBar {...actions} />
      </div>
    </>
  );
}

export const PlayerStates: StoryObj = {
  render: function Story() {
    return (
      <Stack overflowY="auto">
        <div
          style={{ display: "grid", gridTemplateColumns: "max-content auto", alignItems: "center" }}
        >
          {[
            PlayerPresence.NOT_PRESENT,
            PlayerPresence.INITIALIZING,
            PlayerPresence.RECONNECTING,
            PlayerPresence.BUFFERING,
            PlayerPresence.PRESENT,
            PlayerPresence.ERROR,
          ].map((presence) => (
            <MockMessagePipelineProvider
              key={presence}
              name="https://exampleurl:2002"
              presence={presence}
              problems={
                presence === PlayerPresence.ERROR
                  ? [
                    { severity: "error", message: "example error" },
                    { severity: "warn", message: "example warn" },
                  ]
                  : undefined
              }
            >
              <LabeledAppBar label={presence} {...actions} />
            </MockMessagePipelineProvider>
          ))}
          <MockMessagePipelineProvider
            name="https://exampleurl:2002"
            presence={PlayerPresence.INITIALIZING}
            problems={[
              { severity: "error", message: "example error" },
              { severity: "warn", message: "example warn" },
            ]}
          >
            <LabeledAppBar label="INITIALIZING + problems" {...actions} />
          </MockMessagePipelineProvider>
          <MockMessagePipelineProvider
            name={undefined}
            presence={PlayerPresence.INITIALIZING}
            problems={[
              { severity: "error", message: "example error" },
              { severity: "warn", message: "example warn" },
            ]}
          >
            <LabeledAppBar label="INITIALIZING + no name" {...actions} />
          </MockMessagePipelineProvider>
        </div>
      </Stack>
    );
  },

  parameters: { colorScheme: "light" },
};

export const PlayerStatesChinese: StoryObj = {
  ...PlayerStates,
  parameters: { colorScheme: "light", forceLanguage: "zh" },
};

export const DataSources: StoryObj = {
  render: function Story() {
    return (
      <Stack overflowY="auto">
        <div
          style={{ display: "grid", gridTemplateColumns: "max-content auto", alignItems: "center" }}
        >
          <MockMessagePipelineProvider
            name="Adapted from nuScenes dataset. Copyright © 2020 nuScenes. https://www.nuscenes.org/terms-of-use"
            presence={PlayerPresence.PRESENT}
            urlState={{ sourceId: "sample-nuscenes" }}
          >
            <LabeledAppBar label="sample-nuscenes" {...actions} />
          </MockMessagePipelineProvider>
          {[
            "mcap-local-file",
            "ros1-local-bagfile",
            "ros2-local-bagfile",
            "ulog-local-file",
            "remote-file",
          ].map((sourceId) => (
            <MockMessagePipelineProvider
              key={sourceId}
              name="longexampleurlwith_specialcharaters-and-portnumber.ext"
              presence={PlayerPresence.PRESENT}
              urlState={{ sourceId }}
            >
              <LabeledAppBar label={sourceId} {...actions} />
            </MockMessagePipelineProvider>
          ))}
          {[
            "ros1-socket",
            "ros2-socket",
            "rosbridge-websocket",
            "foxglove-websocket",
            "velodyne-device",
            "some other source type",
          ].map((sourceId) => (
            <MockMessagePipelineProvider
              key={sourceId}
              name="https://longexampleurlwith_specialcharaters-and-portnumber:3030"
              presence={PlayerPresence.PRESENT}
              urlState={{ sourceId }}
            >
              <LabeledAppBar label={sourceId} {...actions} />
            </MockMessagePipelineProvider>
          ))}
          <MockMessagePipelineProvider
            name="https://longexampleurlwith_error-and-portnumber:3030"
            presence={PlayerPresence.PRESENT}
            problems={[
              { severity: "error", message: "example error" },
              { severity: "warn", message: "example warn" },
            ]}
          >
            <LabeledAppBar label="with problems" {...actions} />
          </MockMessagePipelineProvider>
        </div>
      </Stack>
    );
  },

  parameters: { colorScheme: "light" },
};

export const DataSourcesChinese: StoryObj = {
  ...DataSources,
  parameters: { colorScheme: "light", forceLanguage: "zh" },
};
