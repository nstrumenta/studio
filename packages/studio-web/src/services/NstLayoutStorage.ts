// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import * as IDB from "idb/with-async-ittr";

import Log from "@foxglove/log";
import { Layout, LayoutID, ILayoutStorage, migrateLayout } from "@foxglove/studio-base";
import { useNstrumentaContext } from "@foxglove/studio-base/context/NstrumentaContext";

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
  public async list(namespace: string): Promise<readonly Layout[]> {
    const results: Layout[] = [];
    const { search } = window.location;
    const { nstClient } = useNstrumentaContext();

    const dataIdParam = new URLSearchParams(search).get("dataId") || "";

    console.log("getting layout from experiment from", dataIdParam);
    const query = await nstClient.storage.query({
      field: "dataId",
      comparison: "==",
      compareValue: dataIdParam,
    });
    console.log(query);
    if (query[0] === undefined) return results;
    const url = await nstClient.storage.getDownloadUrl(query[0].filePath);
    const experiment: JSONType = await (await fetch(url)).json();

    // fetch layouts into results
    console.log(experiment);

    return results;
  }

  public async get(namespace: string, id: LayoutID): Promise<Layout | undefined> {}

  public async put(namespace: string, layout: Layout): Promise<Layout> {}

  public async delete(namespace: string, id: LayoutID): Promise<void> {}

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
}
