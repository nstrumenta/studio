// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { isEqual, keyBy } from "lodash";
import { ReactNode, useState } from "react";
import { StoreApi, createStore } from "zustand";

import { toSec } from "@foxglove/rostime";
import { DataSourceEvent } from "@foxglove/studio-base/context/EventsContext";
import {
  SyncBounds,
  TimelineInteractionStateContext,
  TimelineInteractionStateStore,
} from "@foxglove/studio-base/context/TimelineInteractionStateContext";
import { HoverValue } from "@foxglove/studio-base/types/hoverValue";

function createTimelineInteractionStateStore(): StoreApi<TimelineInteractionStateStore> {
  return createStore((set) => {
    return {
      eventsAtHoverValue: {},
      globalBounds: undefined,
      hoveredEvent: undefined,
      hoverValue: undefined,

      clearHoverValue: (componentId: string) =>
        set((store) => ({
          hoverValue: store.hoverValue?.componentId === componentId ? undefined : store.hoverValue,
        })),

      setEventsAtHoverValue: (eventsAtHoverValue: DataSourceEvent[]) =>
        set({ eventsAtHoverValue: keyBy(eventsAtHoverValue, (event) => event.id) }),

      setGlobalBounds: (
        newBounds:
          | undefined
          | SyncBounds
          | ((oldValue: undefined | SyncBounds) => undefined | SyncBounds),
      ) => {
        if (typeof newBounds === "function") {
          set((store) => ({ globalBounds: newBounds(store.globalBounds) }));
        } else {
          set({ globalBounds: newBounds });
        }
      },

      setHoveredEvent: (hoveredEvent: undefined | DataSourceEvent) => {
        if (hoveredEvent) {
          const secondsSinceStart = toSec(hoveredEvent.startTime); // subtract global start
          set({
            hoveredEvent,
            hoverValue: {
              componentId: `event_${hoveredEvent.id}`,
              type: "PLAYBACK_SECONDS",
              value: secondsSinceStart,
            },
          });
        } else {
          set({ hoveredEvent: undefined, hoverValue: undefined });
        }
      },

      setHoverValue: (newValue: HoverValue) =>
        set((store) => ({
          hoverValue: isEqual(newValue, store.hoverValue) ? store.hoverValue : newValue,
        })),
    };
  });
}

export default function TimelineInteractionStateProvider({
  children,
}: {
  children?: ReactNode;
}): JSX.Element {
  const [store] = useState(createTimelineInteractionStateStore());

  return (
    <TimelineInteractionStateContext.Provider value={store}>
      {children}
    </TimelineInteractionStateContext.Provider>
  );
}
