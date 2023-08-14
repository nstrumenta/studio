// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { range } from "lodash";

import { add } from "@foxglove/rostime";
import { DataSourceEvent } from "@foxglove/studio-base/context/EventsContext";

// ts-prune-ignore-next
export function makeMockEvents(
  count: number,
  startSec: number = 100,
  stepSec: number = 1,
): DataSourceEvent[] {
  return range(0, count).map((idx) => {
    const startTime = { sec: idx * stepSec + startSec, nsec: 0 };
    const duration = { sec: (idx % 3) + 1, nsec: 0 };
    return {
      id: `event_${idx + 1}`,
      endTime: add(startTime, duration),
      startTime,
      metadata: {
        type: ["type A", "type B", "type C"][idx % 3]!,
        state: ["🤖", "🚎", "🚜"][idx % 3]!,
      },
      collection: `device_${idx + 1}`,
    };
  });
}
