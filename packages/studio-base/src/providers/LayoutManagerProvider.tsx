// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { useCallback, useEffect, useMemo } from "react";
import { useNetworkState } from "react-use";

import { useShallowMemo, useVisibilityState } from "@foxglove/hooks";
import Logger from "@foxglove/log";
import { AppSetting } from "@foxglove/studio-base/AppSetting";
import LayoutManagerContext from "@foxglove/studio-base/context/LayoutManagerContext";
import { useLayoutStorage } from "@foxglove/studio-base/context/LayoutStorageContext";
import LayoutStorageDebuggingContext from "@foxglove/studio-base/context/LayoutStorageDebuggingContext";
import { useCurrentUser, useNstrumentaContext } from "@foxglove/studio-base/context/NstrumentaContext";
import { useAppConfigurationValue } from "@foxglove/studio-base/hooks/useAppConfigurationValue";
import useCallbackWithToast from "@foxglove/studio-base/hooks/useCallbackWithToast";
import { ISO8601Timestamp, LayoutID, LayoutPermission } from "@foxglove/studio-base/services/ILayoutStorage";
import { IRemoteLayoutStorage, RemoteLayout } from "@foxglove/studio-base/services/IRemoteLayoutStorage";
import LayoutManager from "@foxglove/studio-base/services/LayoutManager/LayoutManager";
import delay from "@foxglove/studio-base/util/delay";
import { getDownloadURL, ref, uploadString } from "firebase/storage";
import { LayoutData } from "@foxglove/studio-base/context/CurrentLayoutContext/actions";

import { v4 as uuidv4 } from "uuid";

const log = Logger.getLogger(__filename);

const SYNC_INTERVAL_BASE_MS = 60_000;
const SYNC_INTERVAL_MAX_MS = 60 * 60_000;

export default function LayoutManagerProvider({
  children,
}: React.PropsWithChildren<unknown>): JSX.Element {
  const layoutStorage = useLayoutStorage();
  const [enableLayoutDebugging = false] = useAppConfigurationValue<boolean>(
    AppSetting.ENABLE_LAYOUT_DEBUGGING,
  );


  const { firebaseInstance } = useNstrumentaContext();
  const { currentUser } = useCurrentUser();

  console.log(currentUser);
  console.log(firebaseInstance);

  const remoteLayoutStorage = useMemo<IRemoteLayoutStorage>(
    () => {
      const fb = firebaseInstance!;
      class NstrumentaLayoutStorage implements IRemoteLayoutStorage {
        namespace: string = 'nstrumenta';
        filePath = 'projects/peek-ai-2023/data/layouts.json'
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

      return new NstrumentaLayoutStorage();
    }
    , [firebaseInstance?.storage]);


  const layoutManager = useMemo(
    () => new LayoutManager({ local: layoutStorage, remote: remoteLayoutStorage }),
    [layoutStorage, remoteLayoutStorage],
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
