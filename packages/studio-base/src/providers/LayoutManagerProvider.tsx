// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { useCallback, useEffect, useMemo } from "react";
import { useNetworkState } from "react-use";

import { useShallowMemo, useVisibilityState } from "@foxglove/hooks";
import Logger from "@foxglove/log";
import { AppSetting } from "@foxglove/studio-base/AppSetting";
import { LayoutData } from "@foxglove/studio-base/context/CurrentLayoutContext/actions";
import LayoutManagerContext from "@foxglove/studio-base/context/LayoutManagerContext";
import LayoutStorageDebuggingContext from "@foxglove/studio-base/context/LayoutStorageDebuggingContext";
import { useCurrentUser, useNstrumentaContext } from "@foxglove/studio-base/context/NstrumentaContext";
import { useAppConfigurationValue } from "@foxglove/studio-base/hooks/useAppConfigurationValue";
import useCallbackWithToast from "@foxglove/studio-base/hooks/useCallbackWithToast";
import { ILayoutStorage, ISO8601Timestamp, LayoutID, LayoutPermission } from "@foxglove/studio-base/services/ILayoutStorage";
import { IRemoteLayoutStorage, RemoteLayout } from "@foxglove/studio-base/services/IRemoteLayoutStorage";
import LayoutManager from "@foxglove/studio-base/services/LayoutManager/LayoutManager";
import delay from "@foxglove/studio-base/util/delay";
import { getDownloadURL, ref, uploadString } from "firebase/storage";

import * as IDB from "idb/with-async-ittr";
import { v4 as uuidv4 } from "uuid";

import { Layout, migrateLayout } from "@foxglove/studio-base";

import { clearDatabase, exportToJson, importFromJson } from "./IdbBackupAndRestore";


const log = Logger.getLogger(__filename);

const SYNC_INTERVAL_BASE_MS = 60_000;
const SYNC_INTERVAL_MAX_MS = 60 * 60_000;

export default function LayoutManagerProvider({
  children,
}: React.PropsWithChildren<unknown>): JSX.Element {
  const [enableLayoutDebugging = false] = useAppConfigurationValue<boolean>(
    AppSetting.ENABLE_LAYOUT_DEBUGGING,
  );


  const { firebaseInstance, projectId, experiment } = useNstrumentaContext();
  const { currentUser } = useCurrentUser();

  console.log(currentUser);
  console.log(firebaseInstance);


  const nstrumentaLayoutStorage = useMemo<ILayoutStorage | undefined>(
    () => {
      if (firebaseInstance && projectId && experiment) {
        const fb = firebaseInstance!;

        const DATABASE_NAME = "foxglove-layouts";
        const OBJECT_STORE_NAME = "layouts";

        interface LayoutsDB extends IDB.DBSchema {
          layouts: {
            key: [namespace: string, id: LayoutID];
            value: {
              namespace: string;
              layout: Layout;
            };
            indexes: {
              namespace: string;
            };
          };
        }

        /**
         * Stores layouts in IndexedDB. All layouts are stored in one object store, with the primary key
         * being the tuple of [namespace, id].
         */
        class NstLayoutStorage implements ILayoutStorage {
          private _db = IDB.openDB<LayoutsDB>(DATABASE_NAME, 1, {
            upgrade(db) {
              const store = db.createObjectStore(OBJECT_STORE_NAME, {
                keyPath: ["namespace", "layout.id"],
              });
              store.createIndex("namespace", "namespace");
            },
          });

          filePath = experiment?.layoutFilePath ?? `projects/${projectId}/data/layoutDB.json`
          layouts?: Layout[];

          public async list(namespace: string): Promise<readonly Layout[]> {
            const results: Layout[] = [];

            // fetch layouts into results
            try {
              const url = await getDownloadURL(ref(fb.storage, this.filePath));
              this.layouts = await (await fetch(url)).json() as Layout[];
              const db = IDB.unwrap(this._db).result;
              // await clearDatabase(db);
              await importFromJson(db, this.layouts);
            } catch {
              //create file if it doesn't exist
              this.layouts = [];
              uploadString(ref(fb.storage, this.filePath), JSON.stringify(this.layouts)!)
            }

            const records = await (
              await this._db
            ).getAllFromIndex(OBJECT_STORE_NAME, "namespace", namespace);
            for (const record of records) {
              try {
                results.push(migrateLayout(record.layout));
              } catch (err) {
                log.error(err);
              }
            }
            return results;
          }

          public async uploadDbToNstrumenta(): Promise<void> {
            if (fb) {
              const db = IDB.unwrap(this._db).result;
              const stringified = (await exportToJson(db)) as string;

              uploadString(ref(fb.storage, this.filePath), stringified);
            }
          }

          public async get(namespace: string, id: LayoutID): Promise<Layout | undefined> {
            const record = await (await this._db).get(OBJECT_STORE_NAME, [namespace, id]);
            return record == undefined ? undefined : migrateLayout(record.layout);
          }

          public async put(namespace: string, layout: Layout): Promise<Layout> {
            await (await this._db).put(OBJECT_STORE_NAME, { namespace, layout });
            return layout;
          }

          public async delete(namespace: string, id: LayoutID): Promise<void> {
            await (await this._db).delete(OBJECT_STORE_NAME, [namespace, id]);
          }

          public async saveLayoutDb(): Promise<void> {
            await this.uploadDbToNstrumenta();
          }

          public async importLayouts({
            fromNamespace,
            toNamespace,
          }: {
            fromNamespace: string;
            toNamespace: string;
          }): Promise<void> {
            const tx = (await this._db).transaction("layouts", "readwrite");
            const store = tx.objectStore("layouts");

            try {
              for await (const cursor of store.index("namespace").iterate(fromNamespace)) {
                await store.put({ namespace: toNamespace, layout: cursor.value.layout });
                await cursor.delete();
              }
              await tx.done;
            } catch (error) {
              log.error(error);
            }
          }

          public async migrateUnnamespacedLayouts(namespace: string): Promise<void> {
            await this._migrateFromLocalStorage();

            // At the time IdbLayoutStorage was created, all layouts were already namespaced, so there are
            // no un-namespaced layouts to migrate.
            void namespace;
          }

          /**
           * Prior implementation (LocalStorageLayoutStorage) stored layouts in localStorage under a key
           * prefix. This approach was abandoned due to small capacity constraints on localStorage.
           * https://github.com/foxglove/studio/issues/3100
           */
          private async _migrateFromLocalStorage() {
            const legacyLocalStorageKeyPrefix = "studio.layouts";
            const keysToMigrate: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key?.startsWith(`${legacyLocalStorageKeyPrefix}.`) === true) {
                keysToMigrate.push(key);
              }
            }

            for (const key of keysToMigrate) {
              const layoutJson = localStorage.getItem(key);
              if (layoutJson == undefined) {
                continue;
              }
              try {
                const layout = migrateLayout(JSON.parse(layoutJson));
                const [_prefix1, _prefix2, namespace, id] = key.split(".");
                if (namespace == undefined || id == undefined || id !== layout.id) {
                  log.error(`Failed to migrate ${key} from localStorage`);
                  continue;
                }
                // use a separate transaction per item so we can be sure it is safe to delete from localStorage
                await (await this._db).put("layouts", { namespace, layout });
                localStorage.removeItem(key);
              } catch (err) {
                log.error(err);
              }
            }
          }
        }
        return new NstLayoutStorage()
      }
      return undefined
    }, [firebaseInstance?.storage, projectId, experiment]
  )

  const remoteLayoutStorage = useMemo<IRemoteLayoutStorage>(
    () => {
      const fb = firebaseInstance!;
      class NstrumentaRemoteLayoutStorage implements IRemoteLayoutStorage {
        namespace: string = 'nstrumenta';
        filePath = `projects/${projectId}/data/layouts.json`
        layouts?: Map<string, RemoteLayout>;

        async getLayouts(): Promise<RemoteLayout[]> {
          if (!this.layouts) this.layouts = new Map();
          try {
            const url = await getDownloadURL(ref(fb.storage, this.filePath));
            const remoteLayouts = await (await fetch(url)).json() as RemoteLayout[];
            for (const layout of remoteLayouts) {
              this.layouts.set(layout.id, layout)
            }
            return new Promise((resolve) => resolve(Array.from(this.layouts!.values())))
          }
          catch {
            return new Promise((resolve) => resolve([]))
          }
        }
        async getLayout(id: LayoutID): Promise<RemoteLayout | undefined> {
          if (!this.layouts) await this.getLayouts();
          return new Promise(resolve => resolve(this.layouts?.get(id)))
        }
        async saveNewLayout(params: { id: LayoutID | undefined; name: string; data: LayoutData; permission: LayoutPermission; savedAt: ISO8601Timestamp; }): Promise<RemoteLayout> {
          if (!this.layouts) await this.getLayouts();
          const id = params.id ?? uuidv4() as LayoutID;
          const layout = { ...params, id }
          this.layouts?.set(layout.id, layout)
          const layoutsJson = JSON.stringify(Array.from(this.layouts!.values()))!;
          uploadString(ref(fb.storage, this.filePath), layoutsJson);
          return new Promise(resolve => resolve(this.layouts!.get(layout.id)!))
        }
        async updateLayout(params: { id: LayoutID; name?: string; data?: LayoutData; permission?: LayoutPermission; savedAt: ISO8601Timestamp; })
          : Promise<{ status: "success"; newLayout: RemoteLayout } | { status: "conflict" }> {
          if (!this.layouts) await this.getLayouts();
          const layout = { ...this.layouts?.get(params.id)!, ...params }
          this.layouts?.set(layout.id, layout)
          const url = await getDownloadURL(ref(fb.storage, this.filePath));
          await (await fetch(url, { method: 'POST', body: JSON.stringify(Array.from(this.layouts!.values())) }));
          return new Promise(resolve => resolve({ status: "success", newLayout: this.layouts!.get(layout.id)! }))
        }
        async deleteLayout(id: LayoutID): Promise<boolean> {
          if (!this.layouts) await this.getLayouts();
          this.layouts?.delete(id)
          const url = await getDownloadURL(ref(fb.storage, this.filePath));
          await (await fetch(url, { method: 'POST', body: JSON.stringify(Array.from(this.layouts!.values())) }));
          return new Promise(resolve => resolve(true))
        }
      }

      return new NstrumentaRemoteLayoutStorage();
    }
    , [firebaseInstance?.storage, projectId]);


  const layoutManager = useMemo(
    () => new LayoutManager({ local: nstrumentaLayoutStorage!, remote: undefined }),
    [nstrumentaLayoutStorage, remoteLayoutStorage],
  );

  const { online = false } = useNetworkState();
  const visibilityState = useVisibilityState();
  useEffect(() => {
    layoutManager.setOnline(online);
  }, [layoutManager, online]);

  // Sync periodically when logged in, online, and the app is not hidden
  const enableSyncing = remoteLayoutStorage != undefined && online && visibilityState === "visible";
  useEffect(() => {
    if (!enableSyncing) {
      return;
    }
    const controller = new AbortController();
    void (async () => {
      let failures = 0;
      while (!controller.signal.aborted) {
        try {
          await layoutManager.syncWithRemote(controller.signal);
          failures = 0;
        } catch (error) {
          log.error("Sync failed:", error);
          failures++;
        }
        // Exponential backoff with jitter:
        // https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
        const duration =
          Math.random() * Math.min(SYNC_INTERVAL_MAX_MS, SYNC_INTERVAL_BASE_MS * 2 ** failures);
        log.debug("Waiting", (duration / 1000).toFixed(2), "sec for next sync", { failures });
        await delay(duration);
      }
    })();
    return () => {
      log.debug("Canceling layout sync due to effect cleanup callback");
      controller.abort();
    };
  }, [enableSyncing, layoutManager]);

  const syncNow = useCallbackWithToast(async () => {
    await layoutManager.syncWithRemote(new AbortController().signal);
  }, [layoutManager]);

  const injectEdit = useCallback(
    async (id: LayoutID) => {
      const layout = await remoteLayoutStorage?.getLayout(id);
      if (!layout) {
        throw new Error("This layout doesn't exist on the server");
      }
      await remoteLayoutStorage?.updateLayout({
        id: layout.id,
        name: layout.name,
        data: {
          ...layout.data,
          layout: {
            direction: "row",
            first: `onboarding.welcome!${Math.round(Math.random() * 1e6).toString(36)}`,
            second: layout.data.layout ?? "unknown",
            splitPercentage: 33,
          },
        },
        savedAt: new Date().toISOString() as ISO8601Timestamp,
      });
    },
    [remoteLayoutStorage],
  );

  const injectRename = useCallback(
    async (id: LayoutID) => {
      const layout = await remoteLayoutStorage?.getLayout(id);
      if (!layout) {
        throw new Error("This layout doesn't exist on the server");
      }
      await remoteLayoutStorage?.updateLayout({
        ...layout,
        name: `${layout.name} renamed`,
        savedAt: new Date().toISOString() as ISO8601Timestamp,
      });
    },
    [remoteLayoutStorage],
  );

  const injectDelete = useCallback(
    async (id: LayoutID) => {
      await remoteLayoutStorage?.deleteLayout(id);
    },
    [remoteLayoutStorage],
  );

  const setOnline = useCallback(
    // eslint-disable-next-line @foxglove/no-boolean-parameters
    (newValue: boolean) => layoutManager.setOnline(newValue),
    [layoutManager],
  );

  const debugging = useShallowMemo({
    syncNow,
    setOnline,
    injectEdit,
    injectRename,
    injectDelete,
  });

  return (
    <LayoutStorageDebuggingContext.Provider
      value={process.env.NODE_ENV !== "production" && enableLayoutDebugging ? debugging : undefined}
    >
      <LayoutManagerContext.Provider value={layoutManager}>
        {children}
      </LayoutManagerContext.Provider>
    </LayoutStorageDebuggingContext.Provider>
  );
}
