// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/
//
// This file incorporates work covered by the following copyright and
// permission notice:
//
//   Copyright 2018-2021 Cruise LLC
//
//   This source code is licensed under the Apache License, Version 2.0,
//   found at http://www.apache.org/licenses/LICENSE-2.0
//   You may not use this file except in compliance with the License.

import { useTheme } from "@mui/material";
import { StoryFn, StoryObj } from "@storybook/react";
import { useEffect, useRef } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import TestUtils from "react-dom/test-utils";

import Panel from "@foxglove/studio-base/components/Panel";
import ExperimentList from "@foxglove/studio-base/components/ExperimentList";
import PanelCatalogContext, {
  PanelCatalog,
  PanelInfo,
} from "@foxglove/studio-base/context/PanelCatalogContext";
import MockCurrentLayoutProvider from "@foxglove/studio-base/providers/CurrentLayoutProvider/MockCurrentLayoutProvider";

const SamplePanel1 = function () {
  return <div></div>;
};
SamplePanel1.panelType = "sample";
SamplePanel1.defaultConfig = {};

const SamplePanel2 = function () {
  return <div></div>;
};
SamplePanel2.panelType = "sample2";
SamplePanel2.defaultConfig = {};

const MockPanel1 = Panel(SamplePanel1);
const MockPanel2 = Panel(SamplePanel2);

const allPanels: PanelInfo[] = [
  { title: "Regular Panel BBB", type: "Sample1", module: async () => ({ default: MockPanel1 }) },
  { title: "Regular Panel AAA", type: "Sample2", module: async () => ({ default: MockPanel2 }) },

  {
    title: "Preconfigured Panel AAA",
    type: "Sample1",
    description: "Panel description",
    module: async () => ({ default: MockPanel1 }),
    config: { text: "def" },
  },
  {
    title: "Preconfigured Panel BBB",
    type: "Sample2",
    module: async () => ({ default: MockPanel1 }),
    config: { num: 456 },
  },
];

class MockPanelCatalog implements PanelCatalog {
  public getPanels(): readonly PanelInfo[] {
    return allPanels;
  }
  public getPanelByType(type: string): PanelInfo | undefined {
    return allPanels.find((panel) => !panel.config && panel.type === type);
  }
}

const ExperimentListWithInteractions = ({
  inputValue,
  events = [],
}: {
  inputValue?: string;
  events?: TestUtils.SyntheticEventData[];
}) => {
  const theme = useTheme();
  const ref = useRef<HTMLDivElement>(ReactNull);
  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    const input: HTMLInputElement | undefined = el.querySelector("input") as any;
    if (input) {
      input.focus();
      if (inputValue != undefined) {
        input.value = inputValue;
        TestUtils.Simulate.change(input);
      }
      setTimeout(() => {
        events.forEach((event) => {
          TestUtils.Simulate.keyDown(input, event);
        });
      }, 100);
    }
  }, [events, inputValue]);
  return (
    <div
      style={{ margin: 50, height: 480, backgroundColor: theme.palette.background.paper }}
      ref={ref}
    >
      <ExperimentList
        onSelect={(arg0) => {
          console.log(arg0)

          // no-op
        }}
      />
    </div>
  );
};

const arrowDown = { key: "ArrowDown", code: "ArrowDown", keyCode: 40 };
const arrowUp = { key: "ArrowUp", code: "ArrowUp", keyCode: 91 };

export default {
  title: "components/ExperimentList",
  parameters: {
    chromatic: {
      // Wait for simulated key events
      delay: 100,
    },
    colorScheme: "dark",
  },
  decorators: [
    (Wrapped: StoryFn): JSX.Element => {
      return (
        <DndProvider backend={HTML5Backend}>
          <PanelCatalogContext.Provider value={new MockPanelCatalog()}>
            <MockCurrentLayoutProvider>
              <Wrapped />
            </MockCurrentLayoutProvider>
          </PanelCatalogContext.Provider>
        </DndProvider>
      );
    },
  ],
};

export const ExperimentListStory: StoryObj = {
  render: function Story() {
    const theme = useTheme();
    return (
      <div style={{ margin: 50, height: 480, backgroundColor: theme.palette.background.paper }}>
        <ExperimentList onSelect={(arg0) => {
          console.log(arg0)
        }} />
      </div>
    );
  },

  name: "experiment list",
};

export const FilteredExperimentList: StoryObj = {
  render: () => <ExperimentListWithInteractions inputValue="AAA" />,
  name: "filtered experiment list",
};

export const FilteredExperimentListLight: StoryObj = {
  render: () => <ExperimentListWithInteractions inputValue="AAA" />,

  name: "filtered experiment list light",

  parameters: {
    colorScheme: "light",
  },
};

export const NavigatingArrows: StoryObj = {
  render: () => <ExperimentListWithInteractions events={[arrowDown, arrowDown, arrowUp]} />,

  name: "navigating experiment list with arrow keys",
};

export const NavigatingArrowsWrap: StoryObj = {
  render: () => <ExperimentListWithInteractions events={[arrowUp]} />,

  name: "navigating up from top of experiment list will scroll to highlighted last item",
};

export const NoResultsFirst: StoryObj = {
  render: () => <ExperimentListWithInteractions inputValue="regular" />,
  name: "filtered experiment list without results in 1st category",
};

export const NoResultsLast: StoryObj = {
  render: () => <ExperimentListWithInteractions inputValue="preconfigured" />,

  name: "filtered experiment list without results in last category",
};

export const NoResultsAnyList: StoryObj = {
  render: () => <ExperimentListWithInteractions inputValue="WWW" />,
  name: "filtered experiment list without results in any category",
};

export const CaseInsensitiveFilter: StoryObj = {
  render: () => <ExperimentListWithInteractions inputValue="pA" />,

  name: "case-insensitive filtering and highlight submenu",
};

export const ExperimentListChinese: StoryObj = {
  render: function Story() {
    const theme = useTheme();
    return (
      <div style={{ margin: 50, height: 480, backgroundColor: theme.palette.background.paper }}>
        <ExperimentList onSelect={() => { }} />
      </div>
    );
  },

  parameters: { forceLanguage: "zh" },
};
