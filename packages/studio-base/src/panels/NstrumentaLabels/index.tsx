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

import { EventsList } from "@foxglove/studio-base/components/DataSourceSidebar/EventsList";
import Panel from "@foxglove/studio-base/components/Panel";
import PanelToolbar from "@foxglove/studio-base/components/PanelToolbar";
import Stack from "@foxglove/studio-base/components/Stack";

function NstrumentaPanel(): JSX.Element {
  return (
    <Stack fullHeight>
      <PanelToolbar />
      <EventsList />
    </Stack>
  );
}

const defaultConfig: Record<string, unknown> = {};

export default Panel(
  Object.assign(NstrumentaPanel, {
    panelType: "nstrumentaLabels",
    defaultConfig,
  }),
);
