// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { LayoutData } from "@foxglove/studio-base/context/CurrentLayoutContext/actions";

// We use "brand" tags to prevent confusion between string types with distinct meanings
// https://github.com/microsoft/TypeScript/issues/4895
export type LayoutID = string & { __brand: "LayoutID" };
export type ISO8601Timestamp = string & { __brand: "ISO8601Timestamp" };

export type LayoutPermission = "CREATOR_WRITE" | "ORG_READ" | "ORG_WRITE";

export type LayoutSyncStatus =
  | "new"
  | "updated"
  | "tracked"
  | "locally-deleted"
  | "remotely-deleted";
export type Layout = {
  id: LayoutID;
  name: string;
  permission: LayoutPermission;

  /** @deprecated old field name, migrated to working/baseline */
  data?: LayoutData;
  /** @deprecated old field name, migrated to working/baseline */
  state?: LayoutData;

  /** The last explicitly saved version of this layout. */
  baseline: {
    data: LayoutData;
    savedAt: ISO8601Timestamp | undefined;
  };

  /**
   * The working copy of this layout, if it has been edited since the last explicit save.
   */
  working:
  | {
    data: LayoutData;
    savedAt: ISO8601Timestamp | undefined;
  }
  | undefined;

  /** Info about this layout from remote storage. */
  syncInfo:
  | {
    status: LayoutSyncStatus;
    /** The last savedAt time returned by the server. */
    lastRemoteSavedAt: ISO8601Timestamp | undefined;
  }
  | undefined;
};

export interface ILayoutStorage {
  list(): Promise<readonly Layout[]>;
  get(id: LayoutID): Promise<Layout | undefined>;
  put(layout: Layout): Promise<Layout>;
  delete(id: LayoutID): Promise<void>;
}

export function layoutPermissionIsShared(
  permission: LayoutPermission,
): permission is Exclude<LayoutPermission, "CREATOR_WRITE"> {
  return permission !== "CREATOR_WRITE";
}

export function layoutIsShared(
  layout: Layout,
): layout is Layout & { permission: Exclude<LayoutPermission, "CREATOR_WRITE"> } {
  return layoutPermissionIsShared(layout.permission);
}

export function layoutAppearsDeleted(layout: Layout): boolean {
  return (
    layout.syncInfo?.status === "locally-deleted" ||
    (layout.syncInfo?.status === "remotely-deleted" && layout.working == undefined)
  );
}
