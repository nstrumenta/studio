// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { NstrumentaBrowserClient } from "nstrumenta/dist/browser/client";

import {
  DataSourceFactoryInitializeArgs,
  IDataSourceFactory,
} from "@foxglove/studio-base/context/PlayerSelectionContext";
import { IterablePlayer, WorkerIterableSource } from "@foxglove/studio-base/players/IterablePlayer";

class NstrumentaDataSourceFactory implements IDataSourceFactory {
  public id = "nstrumenta";
  public type: IDataSourceFactory["type"] = "nstrumenta";
  public displayName = "nstrumenta";
  public iconName: IDataSourceFactory["iconName"] = "FileASPX";
  public hidden = true;
  public sampleLayout: IDataSourceFactory["sampleLayout"];
  public nstClient: NstrumentaBrowserClient;

  public constructor(nstClient: NstrumentaBrowserClient) {
    this.nstClient = nstClient;
  }

  public async initialize(
    args: DataSourceFactoryInitializeArgs,
  ): ReturnType<IDataSourceFactory["initialize"]> {
    const { search } = window.location;
    const dataIdParam = new URLSearchParams(search).get("dataId") ?? "";
    const query = await this.nstClient.storage.query({
      field: "dataId",
      comparison: "==",
      compareValue: dataIdParam,
    });
    if (query[0] == undefined) { return; }
    const nstExperimentUrl = await this.nstClient.storage.getDownloadUrl(query[0].filePath);
    const nstExperiment = await (await fetch(nstExperimentUrl)).json() as { layoutFilePath?: string, dataFilePath?: string };

    if (nstExperiment.layoutFilePath != undefined) {
      const nstLayoutUrl = await this.nstClient.storage.getDownloadUrl(
        nstExperiment.layoutFilePath,
      );
      const nstLayout = await (await fetch(nstLayoutUrl)).json();
      if (nstLayout != undefined) {
        this.sampleLayout = nstLayout;
      }
    }

    const dataFilePath = nstExperiment.dataFilePath;

    let dataUrl: string = '';
    if (dataFilePath != undefined) {
      dataUrl = await this.nstClient.storage.getDownloadUrl(dataFilePath);
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
