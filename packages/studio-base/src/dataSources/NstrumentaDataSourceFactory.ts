// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/


import { getDownloadURL, ref } from "firebase/storage";

import {
  DataSourceFactoryInitializeArgs,
  IDataSourceFactory,
} from "@foxglove/studio-base/context/PlayerSelectionContext";
import { IterablePlayer, WorkerIterableSource } from "@foxglove/studio-base/players/IterablePlayer";
import { Player } from "@foxglove/studio-base/players/types";
import { FirebaseInstance } from "@foxglove/studio-base/providers/NstrumentaProvider";

class NstrumentaDataSourceFactory implements IDataSourceFactory {
  public id = "nstrumenta";
  public type: IDataSourceFactory["type"] = "nstrumenta";
  public displayName = "nstrumenta";
  public iconName: IDataSourceFactory["iconName"] = "FileASPX";
  public hidden = true;
  public firebaseInstance: FirebaseInstance;

  public constructor(firebaseInstance: FirebaseInstance) {
    this.firebaseInstance = firebaseInstance
  }

  public async initialize(
    args: DataSourceFactoryInitializeArgs,
  ): Promise<Player | undefined> {

    const { dataUrl } = args.params!;
    if (this.firebaseInstance?.storage == undefined) {
      console.error("firebase not initialized");
      return;
    }


    const source = new WorkerIterableSource({
      initWorker: () => {
        return new Worker(
          // foxglove-depcheck-used: babel-plugin-transform-import-meta
          new URL(
            "@foxglove/studio-base/players/IterablePlayer/Mcap/McapIterableSourceWorker.worker",
            import.meta.url,
          ),
        );
      },
      initArgs: { url: dataUrl },
    });

    return new IterablePlayer({
      source,
      isSampleDataSource: true,
      name: "nstrumenta",
      metricsCollector: args.metricsCollector,
      // Use blank url params so the data source is set in the url
      urlParams: {},
      sourceId: this.id,
    });
  }
}

export default NstrumentaDataSourceFactory;
