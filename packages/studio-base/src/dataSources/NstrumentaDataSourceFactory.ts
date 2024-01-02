// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/


import { getDownloadURL, ref } from "firebase/storage";

import { useNstrumentaContext } from "@foxglove/studio-base/context/NstrumentaContext";
import {
  DataSourceFactoryInitializeArgs,
  IDataSourceFactory,
} from "@foxglove/studio-base/context/PlayerSelectionContext";
import { IterablePlayer, WorkerIterableSource } from "@foxglove/studio-base/players/IterablePlayer";
import { Player } from "@foxglove/studio-base/players/types";

class NstrumentaDataSourceFactory implements IDataSourceFactory {
  public id = "nstrumenta";
  public type: IDataSourceFactory["type"] = "nstrumenta";
  public displayName = "nstrumenta";
  public iconName: IDataSourceFactory["iconName"] = "FileASPX";
  public hidden = true;

  public constructor() {
  }

  public async initialize(
    args: DataSourceFactoryInitializeArgs,
  ): Promise<Player | undefined> {

    const { firebaseInstance } = useNstrumentaContext();

    if (firebaseInstance?.storage == undefined) {
      console.error("firebase not initialized");
      return;
    }
    const dataFilePath = "projects/peek-ai-2023/data/recording-f1bf24c7-100d-42a5-84d1-3aa8c9a104ce.mcap"; // TODO picker for this

    let dataUrl: string = "";
    if (dataFilePath != undefined) {
      dataUrl = await getDownloadURL(ref(firebaseInstance.storage, dataFilePath));
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
