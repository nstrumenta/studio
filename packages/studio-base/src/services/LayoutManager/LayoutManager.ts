// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import EventEmitter from "eventemitter3";
import { partition } from "lodash";
import { v4 as uuidv4 } from "uuid";

import Logger from "@foxglove/log";
import { LayoutData } from "@foxglove/studio-base/context/CurrentLayoutContext/actions";
import {
  ILayoutManager,
  LayoutManagerChangeEvent,
  LayoutManagerEventTypes,
} from "@foxglove/studio-base/services/ILayoutManager";
import {
  ILayoutStorage,
  ISO8601Timestamp,
  Layout,
  LayoutID,
  LayoutPermission,
  layoutAppearsDeleted,
  layoutIsShared,
  layoutPermissionIsShared
} from "@foxglove/studio-base/services/ILayoutStorage";
import {
  IRemoteLayoutStorage,
  RemoteLayout,
} from "@foxglove/studio-base/services/IRemoteLayoutStorage";

import { migratePanelsState } from "../migrateLayout";
import { isLayoutEqual } from "./compareLayouts";
import computeLayoutSyncOperations, { SyncOperation } from "./computeLayoutSyncOperations";

const log = Logger.getLogger(__filename);

/**
 * Try to perform the given updateLayout operation on remote storage. If a conflict is returned,
 * fetch the most recent version of the layout and return that instead.
 */
async function updateOrFetchLayout(
  remote: IRemoteLayoutStorage,
  params: Parameters<IRemoteLayoutStorage["updateLayout"]>[0],
): Promise<RemoteLayout> {
  const response = await remote.updateLayout(params);
  switch (response.status) {
    case "success":
      return response.newLayout;
    case "conflict": {
      const remoteLayout = await remote.getLayout(params.id);
      if (!remoteLayout) {
        throw new Error(`Update rejected but layout is not present on server: ${params.id}`);
      }
      log.info(`Layout update rejected, using server version: ${params.id}`);
      return remoteLayout;
    }
  }
}

export default class LayoutManager implements ILayoutManager {
  public static readonly LOCAL_STORAGE_NAMESPACE = "local";
  public static readonly REMOTE_STORAGE_NAMESPACE_PREFIX = "remote-";

  /**
   * All access to storage is wrapped in a mutex to prevent multi-step operations (such as reading
   * and then writing a single layout, or writing one and deleting another) from getting
   * interleaved.
   */
  private local: ILayoutStorage;
  private remote: IRemoteLayoutStorage | undefined;

  public readonly supportsSharing: boolean;

  private emitter = new EventEmitter<LayoutManagerEventTypes>();

  private busyCount = 0;

  /**
   * A decorator to emit busy events before and after an async operation so the UI can show that the
   * operation is in progress.
   */
  private static withBusyStatus<Args extends unknown[], Ret>(
    _prototype: typeof LayoutManager.prototype,
    _propertyKey: string,
    descriptor: TypedPropertyDescriptor<(this: LayoutManager, ...args: Args) => Promise<Ret>>,
  ) {
    const method = descriptor.value!;
    descriptor.value = async function (...args) {
      try {
        this.busyCount++;
        this.emitter.emit("busychange");
        return await method.apply(this, args);
      } finally {
        this.busyCount--;
        this.emitter.emit("busychange");
      }
    };
  }

  // eslint-disable-next-line no-restricted-syntax
  public get isBusy(): boolean {
    return this.busyCount > 0;
  }

  public isOnline = false;

  public error: undefined | Error = undefined;

  // eslint-disable-next-line @foxglove/no-boolean-parameters
  public setOnline(online: boolean): void {
    this.isOnline = online;
    this.emitter.emit("onlinechange");
  }

  public setError(error: undefined | Error): void {
    this.error = error;
    this.emitter.emit("errorchange");
  }

  public constructor({
    local,
    remote,
  }: {
    local: ILayoutStorage;
    remote: IRemoteLayoutStorage | undefined;
  }) {

    this.local = local;
    this.remote = remote;
    this.supportsSharing = remote != undefined;
  }

  public on<E extends EventEmitter.EventNames<LayoutManagerEventTypes>>(
    name: E,
    listener: EventEmitter.EventListener<LayoutManagerEventTypes, E>,
  ): void {
    this.emitter.on(name, listener);
  }
  public off<E extends EventEmitter.EventNames<LayoutManagerEventTypes>>(
    name: E,
    listener: EventEmitter.EventListener<LayoutManagerEventTypes, E>,
  ): void {
    this.emitter.off(name, listener);
  }

  private notifyChangeListeners(event: LayoutManagerChangeEvent) {
    queueMicrotask(() => this.emitter.emit("change", event));
  }

  public async getLayouts(): Promise<readonly Layout[]> {

    const layouts = await this.local.list();
    return layouts.filter((layout) => !layoutAppearsDeleted(layout));

  }

  public async getLayout(id: LayoutID): Promise<Layout | undefined> {

    const localLayout = await this.local.get(id);
    if (localLayout) {
      log.debug(`Local layout loaded:${id}`);
      return localLayout;
    }
    return undefined;
  }

  @LayoutManager.withBusyStatus
  public async saveNewLayout({
    name,
    data: unmigratedData,
    permission,
  }: {
    name: string;
    data: LayoutData;
    permission: LayoutPermission;
  }): Promise<Layout> {
    const data = migratePanelsState(unmigratedData);
    if (layoutPermissionIsShared(permission)) {
      if (!this.remote) {
        throw new Error("Shared layouts are not supported without remote layout storage");
      }
      if (!this.isOnline) {
        throw new Error("Cannot share a layout while offline");
      }
      const newLayout = await this.remote.saveNewLayout({
        id: uuidv4() as LayoutID,
        name,
        data,
        permission,
        savedAt: new Date().toISOString() as ISO8601Timestamp,
      });

      const result = await this.local.put({
        id: newLayout.id,
        name: newLayout.name,
        permission: newLayout.permission,
        baseline: { data: newLayout.data, savedAt: newLayout.savedAt },
        working: undefined,
        syncInfo: { status: "tracked", lastRemoteSavedAt: newLayout.savedAt },
      })

      this.notifyChangeListeners({ type: "change", updatedLayout: undefined });
      return result;
    }

    const newLayout = await this.local.put({
      id: uuidv4() as LayoutID,
      name,
      permission,
      baseline: { data, savedAt: new Date().toISOString() as ISO8601Timestamp },
      working: undefined,
      syncInfo: this.remote ? { status: "new", lastRemoteSavedAt: undefined } : undefined,
    })

    this.notifyChangeListeners({ type: "change", updatedLayout: newLayout });
    return newLayout;
  }

  @LayoutManager.withBusyStatus
  public async updateLayout({
    id,
    name,
    data,
  }: {
    id: LayoutID;
    name: string | undefined;
    data: LayoutData | undefined;
  }): Promise<Layout> {
    const now = new Date().toISOString() as ISO8601Timestamp;
    const localLayout = await this.local.get(id);
    if (!localLayout) {
      throw new Error(`Cannot update layout ${id} because it does not exist`);
    }

    // If the modifications result in the same layout data, set the working copy to undefined so the
    // layout appears unmodified.
    const newWorking =
      data == undefined
        ? localLayout.working
        : isLayoutEqual(localLayout.baseline.data, data)
          ? undefined
          : { data, savedAt: now };

    // Renames of shared layouts go directly to the server
    if (name != undefined && layoutIsShared(localLayout)) {
      if (!this.remote) {
        throw new Error("Shared layouts are not supported without remote layout storage");
      }
      if (!this.isOnline) {
        throw new Error("Cannot update a shared layout while offline");
      }
      const updatedBaseline = await updateOrFetchLayout(this.remote, { id, name, savedAt: now });
      const result =
        await this.local.put({
          ...localLayout,
          name: updatedBaseline.name,
          baseline: { data: updatedBaseline.data, savedAt: updatedBaseline.savedAt },
          working: newWorking,
          syncInfo: { status: "tracked", lastRemoteSavedAt: updatedBaseline.savedAt },
        })

      this.notifyChangeListeners({ type: "change", updatedLayout: result });
      return result;
    } else {
      const isRename =
        this.remote != undefined &&
        name != undefined &&
        localLayout.syncInfo != undefined &&
        localLayout.syncInfo.status !== "new";
      const result = await this.local.put({
        ...localLayout,
        name: name ?? localLayout.name,
        working: newWorking,

        // If the name is being changed, we will need to upload to the server with a new savedAt
        baseline: isRename ? { ...localLayout.baseline, savedAt: now } : localLayout.baseline,
        syncInfo: isRename
          ? { status: "updated", lastRemoteSavedAt: localLayout.syncInfo?.lastRemoteSavedAt }
          : localLayout.syncInfo,
      });

      this.notifyChangeListeners({ type: "change", updatedLayout: result });
      return result;
    }
  }

  @LayoutManager.withBusyStatus
  public async deleteLayout({ id }: { id: LayoutID }): Promise<void> {
    const localLayout = await this.local.get(id);
    if (!localLayout) {
      throw new Error(`Cannot update layout ${id} because it does not exist`);
    }
    if (layoutIsShared(localLayout)) {
      if (!this.remote) {
        throw new Error("Shared layouts are not supported without remote layout storage");
      }
      if (localLayout.syncInfo?.status !== "remotely-deleted") {
        if (!this.isOnline) {
          throw new Error("Cannot delete a shared layout while offline");
        }
        await this.remote.deleteLayout(id);
      }
    }

    if (this.remote && !layoutIsShared(localLayout)) {
      await this.local.put({
        ...localLayout,
        working: {
          data: localLayout.working?.data ?? localLayout.baseline.data,
          savedAt: new Date().toISOString() as ISO8601Timestamp,
        },
        syncInfo: {
          status: "locally-deleted",
          lastRemoteSavedAt: localLayout.syncInfo?.lastRemoteSavedAt,
        },
      });
    } else {
      // Don't have remote storage, or already deleted on remote
      await this.local.delete(id);
    }

    this.notifyChangeListeners({ type: "delete", layoutId: id });
  }

  @LayoutManager.withBusyStatus
  public async overwriteLayout({ id }: { id: LayoutID }): Promise<Layout> {
    const localLayout = await this.local.get(id);
    if (!localLayout) {
      throw new Error(`Cannot overwrite layout ${id} because it does not exist`);
    }
    const now = new Date().toISOString() as ISO8601Timestamp;
    if (layoutIsShared(localLayout)) {
      if (!this.remote) {
        throw new Error("Shared layouts are not supported without remote layout storage");
      }
      if (!this.isOnline) {
        throw new Error("Cannot save a shared layout while offline");
      }
      const updatedBaseline = await updateOrFetchLayout(this.remote, {
        id,
        data: localLayout.working?.data ?? localLayout.baseline.data,
        savedAt: now,
      });
      const result =
        await this.local.put({
          ...localLayout,
          baseline: { data: updatedBaseline.data, savedAt: updatedBaseline.savedAt },
          working: undefined,
          syncInfo: { status: "tracked", lastRemoteSavedAt: updatedBaseline.savedAt },
        });

      this.notifyChangeListeners({ type: "change", updatedLayout: result });
      return result;
    } else {
      const result =
        await this.local.put({
          ...localLayout,
          baseline: {
            data: localLayout.working?.data ?? localLayout.baseline.data,
            savedAt: now,
          },
          working: undefined,
          syncInfo:
            this.remote && localLayout.syncInfo?.status !== "new"
              ? { status: "updated", lastRemoteSavedAt: localLayout.syncInfo?.lastRemoteSavedAt }
              : localLayout.syncInfo,
        })

      this.notifyChangeListeners({ type: "change", updatedLayout: result });
      return result;
    }
  }

  @LayoutManager.withBusyStatus
  public async revertLayout({ id }: { id: LayoutID }): Promise<Layout> {

    const layout = await this.local.get(id);
    if (!layout) {
      throw new Error(`Cannot revert layout id ${id} because it does not exist`);
    }
    const result = await this.local.put({
      ...layout,
      working: undefined,
    });

    this.notifyChangeListeners({ type: "change", updatedLayout: result });
    return result;
  }

  @LayoutManager.withBusyStatus
  public async makePersonalCopy({ id, name }: { id: LayoutID; name: string }): Promise<Layout> {
    const now = new Date().toISOString() as ISO8601Timestamp;

    const layout = await this.local.get(id);
    if (!layout) {
      throw new Error(`Cannot make a personal copy of layout id ${id} because it does not exist`);
    }
    await this.local.put({
      id: uuidv4() as LayoutID,
      name,
      permission: "CREATOR_WRITE",
      baseline: { data: layout.working?.data ?? layout.baseline.data, savedAt: now },
      working: undefined,
      syncInfo: { status: "new", lastRemoteSavedAt: now },
    });
    const result = await this.local.put({ ...layout, working: undefined });

    this.notifyChangeListeners({ type: "change", updatedLayout: undefined });
    return result;
  }

  /** Ensures at most one sync operation is in progress at a time */
  private currentSync?: Promise<void>;

  /**
   * Attempt to synchronize the local cache with remote storage. At minimum this incurs a fetch of
   * the cached and remote layout lists; it may also involve modifications to the cache, remote
   * storage, or both.
   */
  @LayoutManager.withBusyStatus
  public async syncWithRemote(abortSignal: AbortSignal): Promise<void> {
    if (this.currentSync) {
      log.debug("Layout sync is already in progress");
      return await this.currentSync;
    }
    const start = performance.now();
    try {
      log.debug("Starting layout sync");
      this.currentSync = this.syncWithRemoteImpl(abortSignal);
      await this.currentSync;
      this.notifyChangeListeners({ type: "change", updatedLayout: undefined });
      if (this.error) {
        this.setError(undefined);
      }
    } catch (error) {
      this.setError(error);
      throw error;
    } finally {
      this.currentSync = undefined;
      log.debug(`Completed sync in ${((performance.now() - start) / 1000).toFixed(2)}s`);
    }
  }

  private async syncWithRemoteImpl(abortSignal: AbortSignal): Promise<void> {
    if (!this.remote || !this.isOnline) {
      return;
    }

    const [localLayouts, remoteLayouts] = await Promise.all([
      await this.local.list(),
      this.remote.getLayouts(),
    ]);
    if (abortSignal.aborted) {
      return;
    }

    const syncOperations = computeLayoutSyncOperations(localLayouts, remoteLayouts);
    const [localOps, remoteOps] = partition(
      syncOperations,
      (op): op is typeof op & { local: true } => op.local,
    );
    await Promise.all([
      this.performLocalSyncOperations(localOps, abortSignal),
      this.performRemoteSyncOperations(remoteOps, abortSignal),
    ]);
  }

  private async performLocalSyncOperations(
    operations: readonly (SyncOperation & { local: true })[],
    abortSignal: AbortSignal,
  ): Promise<void> {

    for (const operation of operations) {
      if (abortSignal.aborted) {
        return;
      }
      switch (operation.type) {
        case "mark-deleted": {
          const { localLayout } = operation;
          log.debug(`Marking layout as remotely deleted: ${localLayout.id}`);
          await this.local.put({
            ...localLayout,
            syncInfo: { status: "remotely-deleted", lastRemoteSavedAt: undefined },
          });
          break;
        }

        case "delete-local":
          log.debug(
            `Deleting local layout ${operation.localLayout.id}, whose sync status was ${operation.localLayout.syncInfo?.status}`,
          );
          await this.local.delete(operation.localLayout.id);
          this.notifyChangeListeners({ type: "delete", layoutId: operation.localLayout.id });
          break;

        case "add-to-cache": {
          const { remoteLayout } = operation;
          log.debug(`Adding layout to cache: ${remoteLayout.id}`);
          await this.local.put({
            id: remoteLayout.id,
            name: remoteLayout.name,
            permission: remoteLayout.permission,
            baseline: { data: remoteLayout.data, savedAt: remoteLayout.savedAt },
            working: undefined,
            syncInfo: { status: "tracked", lastRemoteSavedAt: remoteLayout.savedAt },
          });
          break;
        }

        case "update-baseline": {
          const { localLayout, remoteLayout } = operation;
          log.debug(`Updating baseline for ${localLayout.id}`);
          await this.local.put({
            id: remoteLayout.id,
            name: remoteLayout.name,
            permission: remoteLayout.permission,
            baseline: { data: remoteLayout.data, savedAt: remoteLayout.savedAt },
            working: localLayout.working,
            syncInfo: {
              status: localLayout.syncInfo.status,
              lastRemoteSavedAt: remoteLayout.savedAt,
            },
          });
          break;
        }
      }
    }

  }

  private async performRemoteSyncOperations(
    operations: readonly (SyncOperation & { local: false })[],
    abortSignal: AbortSignal,
  ): Promise<void> {
    const { remote } = this;
    if (!remote) {
      return;
    }

    // Any necessary local cleanups are performed all at once after the server operations, so the
    // server ops can be done without blocking other local sync operations.
    type CleanupFunction = (local: ILayoutStorage) => Promise<void>;

    const cleanups = await Promise.all(
      operations.map(async (operation): Promise<CleanupFunction> => {
        switch (operation.type) {
          case "delete-remote": {
            const { localLayout } = operation;
            log.debug(`Deleting remote layout ${localLayout.id}`);
            if (!(await remote.deleteLayout(localLayout.id))) {
              log.warn(`Deleting layout ${localLayout.id} which was not present in remote storage`);
            }
            return async (local) => {
              if (abortSignal.aborted) {
                return;
              }
              await local.delete(localLayout.id);
            };
          }

          case "upload-new": {
            const { localLayout } = operation;
            log.debug(`Uploading new layout ${localLayout.id}`);
            const newBaseline = await remote.saveNewLayout({
              id: localLayout.id,
              name: localLayout.name,
              data: localLayout.baseline.data,
              permission: localLayout.permission,
              savedAt:
                localLayout.baseline.savedAt ?? (new Date().toISOString() as ISO8601Timestamp),
            });
            return async (local) => {
              // Don't check abortSignal; we need the cache to be updated to show the layout is tracked
              await local.put({
                ...localLayout,
                baseline: { ...localLayout.baseline, savedAt: newBaseline.savedAt },
                syncInfo: { status: "tracked", lastRemoteSavedAt: newBaseline.savedAt },
              });
            };
          }

          case "upload-updated": {
            const { localLayout } = operation;
            log.debug(`Uploading updated layout ${localLayout.id}`);
            const newBaseline = await updateOrFetchLayout(remote, {
              id: localLayout.id,
              name: localLayout.name,
              data: localLayout.baseline.data,
              savedAt:
                localLayout.baseline.savedAt ?? (new Date().toISOString() as ISO8601Timestamp),
            });
            return async (local) => {
              // Don't check abortSignal; we need the cache to be updated to show the layout is tracked
              await local.put({
                ...localLayout,
                name: newBaseline.name,
                baseline: { ...localLayout.baseline, savedAt: newBaseline.savedAt },
                syncInfo: { status: "tracked", lastRemoteSavedAt: newBaseline.savedAt },
              });
            };
          }
        }
      }),
    );


    await Promise.all(cleanups.map(async (cleanup) => await cleanup(this.local)));

  }
}
