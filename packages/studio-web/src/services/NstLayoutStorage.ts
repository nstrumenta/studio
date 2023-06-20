// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import * as IDB from "idb/with-async-ittr";
import { NstrumentaBrowserClient } from "nstrumenta/dist/browser/client";

import Log from "@foxglove/log";
import { ILayoutStorage, Layout, LayoutID, migrateLayout } from "@foxglove/studio-base";

import { clearDatabase, exportToJson, importFromJson } from "./IdbBackupAndRestore";

const log = Log.getLogger(__filename);

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
export class NstLayoutStorage implements ILayoutStorage {
  private _db = IDB.openDB<LayoutsDB>(DATABASE_NAME, 1, {
    upgrade(db) {
      const store = db.createObjectStore(OBJECT_STORE_NAME, {
        keyPath: ["namespace", "layout.id"],
      });
      store.createIndex("namespace", "namespace");
    },
  });

  private nstClient: NstrumentaBrowserClient | undefined;
  private layoutFileId: string | undefined;

  public async list(namespace: string): Promise<readonly Layout[]> {
    const results: Layout[] = [];
    const { search } = window.location;
    const apiKeyParam = new URLSearchParams(search).get("apiKey");
    const apiLocalStore = localStorage.getItem("apiKey");
    const apiKey = apiKeyParam
      ? apiKeyParam
      : apiLocalStore
        ? apiLocalStore
        : (prompt("Enter your nstrumenta apiKey") as string);
    if (apiKey) {
      localStorage.setItem("apiKey", apiKey);
    }
    this.nstClient = new NstrumentaBrowserClient(apiKey);

    const dataIdParam = new URLSearchParams(search).get("dataId") ?? "";

    const query = await this.nstClient.storage.query({
      field: "dataId",
      comparison: "==",
      compareValue: dataIdParam,
    });
    if (query[0] == undefined) { return results; }
    const url = await this.nstClient.storage.getDownloadUrl(query[0].filePath);
    const nstExperiment = await (await fetch(url)).json() as { layoutFilePath?: string, dataFilePath?: string };

    // fetch layouts into results
    if (nstExperiment.layoutFilePath != undefined) {
      //query to get explicitDataId (currently needed for uploading)
      const layoutQuery = await this.nstClient.storage.query({
        field: "filePath",
        comparison: "==",
        compareValue: nstExperiment.layoutFilePath,
      });
      if (layoutQuery[0] == undefined) { return results; }
      this.layoutFileId = layoutQuery[0].dataId;

      const nstLayoutUrl = await this.nstClient.storage.getDownloadUrl(nstExperiment.layoutFilePath);
      const layoutFileContents = await (await fetch(nstLayoutUrl)).json() as Record<string, unknown>;
      const db = IDB.unwrap(this._db).result;
      await clearDatabase(db);
      await importFromJson(db, layoutFileContents);
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
    if (this.nstClient) {
      const db = IDB.unwrap(this._db).result;
      const stringified = (await exportToJson(db)) as string;

      const data = new Blob([stringified], {
        type: "application/json",
      });
      await this.nstClient.storage.upload({
        dataId: this.layoutFileId,
        data,
        filename: "layoutDB.json",
        meta: {},
        overwrite: true,
      });
    }
  }

  public async get(namespace: string, id: LayoutID): Promise<Layout | undefined> {
    const record = await (await this._db).get(OBJECT_STORE_NAME, [namespace, id]);
    return record == undefined ? undefined : migrateLayout(record.layout);
  }

  public async put(namespace: string, layout: Layout): Promise<Layout> {
    await (await this._db).put(OBJECT_STORE_NAME, { namespace, layout });
    await this.uploadDbToNstrumenta();
    return layout;
  }

  public async delete(namespace: string, id: LayoutID): Promise<void> {
    await (await this._db).delete(OBJECT_STORE_NAME, [namespace, id]);
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
