// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

/**
 * Export all data from an IndexedDB database
 *
 * @param {IDBDatabase} idbDatabase The database to export from
 * @return {Promise<string>}
 */
export async function exportToJson(idbDatabase: IDBDatabase) {
  return await new Promise((resolve, reject) => {
    const exportObject: Record<string, unknown> = {};
    if (idbDatabase.objectStoreNames.length === 0) {
      resolve(JSON.stringify(exportObject));
    } else {
      const transaction = idbDatabase.transaction(idbDatabase.objectStoreNames, "readonly");

      transaction.addEventListener("error", reject);

      for (const storeName of idbDatabase.objectStoreNames) {
        const allObjects: Array<unknown> = [];
        transaction
          .objectStore(storeName)
          .openCursor()
          .addEventListener("success", (event) => {
            const cursor = (event.target as unknown as { result: IDBCursorWithValue }).result;
            if (cursor) {
              // Cursor holds value, put it into store data
              allObjects.push(cursor.value);
              cursor.continue();
            } else {
              // No more values, store is done
              exportObject[storeName] = allObjects;

              // Last store was handled
              if (idbDatabase.objectStoreNames.length === Object.keys(exportObject).length) {
                resolve(JSON.stringify(exportObject));
              }
            }
          });
      }
    }
  });
}

/**
 * Import data from JSON into an IndexedDB database.
 * This does not delete any existing data from the database, so keys may clash.
 *
 * @param {IDBDatabase} idbDatabase Database to import into
 * @param {Object}      json        Data to import, one key per object store
 * @return {Promise<void>}
 */
export async function importFromJson(idbDatabase: IDBDatabase, importObject: any) {
  return await new Promise<void>((resolve, reject) => {
    const transaction = idbDatabase.transaction(idbDatabase.objectStoreNames, "readwrite");
    transaction.addEventListener("error", reject);

    for (const storeName of idbDatabase.objectStoreNames) {
      let count = 0;
      for (const toAdd of importObject[storeName]) {
        const request = transaction.objectStore(storeName).add(toAdd);
        request.addEventListener("success", () => {
          count++;
          if (count === importObject[storeName].length) {
            // Added all objects for this store
            delete importObject[storeName];
            if (Object.keys(importObject).length === 0) {
              // Added all object stores
              resolve();
            }
          }
        });
      }
    }
  });
}

/**
 * Clear a database
 *
 * @param {IDBDatabase} idbDatabase The database to delete all data from
 * @return {Promise<void>}
 */
export async function clearDatabase(idbDatabase: IDBDatabase) {
  return await new Promise<void>((resolve, reject) => {
    const transaction = idbDatabase.transaction(idbDatabase.objectStoreNames, "readwrite");
    transaction.addEventListener("error", reject);

    let count = 0;
    for (const storeName of idbDatabase.objectStoreNames) {
      transaction
        .objectStore(storeName)
        .clear()
        .addEventListener("success", () => {
          count++;
          if (count === idbDatabase.objectStoreNames.length) {
            // Cleared all object stores
            resolve();
          }
        });
    }
  });
}
