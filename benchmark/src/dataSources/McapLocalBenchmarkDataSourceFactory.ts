// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import {
  DataSourceFactoryInitializeArgs,
  IDataSourceFactory,
} from "@foxglove/studio-base/context/PlayerSelectionContext";
import { McapIterableSource } from "@foxglove/studio-base/players/IterablePlayer/Mcap/McapIterableSource";

import { BenchmarkPlayer } from "../players";

class McapLocalBenchmarkDataSourceFactory implements IDataSourceFactory {
  public id = "mcap-local-file";
  public type: IDataSourceFactory["type"] = "file";
  public displayName = "MCAP";
  public iconName: IDataSourceFactory["iconName"] = "OpenFile";
  public supportedFileTypes = [".mcap"];

  public async initialize(args: DataSourceFactoryInitializeArgs): ReturnType<IDataSourceFactory["initialize"]> {
    const file = args.file;
    if (!file) {
      return;
    }

    const mcapProvider = new McapIterableSource({ type: "file", file });
    return new BenchmarkPlayer(file.name, mcapProvider);
  }
}

export { McapLocalBenchmarkDataSourceFactory };
