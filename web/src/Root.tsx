// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { useMemo, useState } from "react";

import {
  IDataSourceFactory,
  Ros1LocalBagDataSourceFactory,
  Ros2LocalBagDataSourceFactory,
  RosbridgeDataSourceFactory,
  RemoteDataSourceFactory,
  FoxgloveDataPlatformDataSourceFactory,
  FoxgloveWebSocketDataSourceFactory,
  UlogLocalDataSourceFactory,
  McapLocalDataSourceFactory,
  SampleNuscenesDataSourceFactory,
  IAppConfiguration,
  IdbExtensionLoader,
  App,
  ConsoleApi,
} from "@foxglove/studio-base";

import Ros1UnavailableDataSourceFactory from "./dataSources/Ros1UnavailableDataSourceFactory";
import Ros2UnavailableDataSourceFactory from "./dataSources/Ros2UnavailableDataSourceFactory";
import VelodyneUnavailableDataSourceFactory from "./dataSources/VelodyneUnavailableDataSourceFactory";
import { IdbLayoutStorage } from "./services/IdbLayoutStorage";

export function Root({ appConfiguration }: { appConfiguration: IAppConfiguration }): JSX.Element {
  const layoutStorage = useMemo(() => new IdbLayoutStorage(), []);
  const [extensionLoaders] = useState(() => [
    new IdbExtensionLoader("org"),
    new IdbExtensionLoader("local"),
  ]);
  const consoleApi = useMemo(() => new ConsoleApi(process.env.FOXGLOVE_API_URL ?? ""), []);

  const dataSources: IDataSourceFactory[] = useMemo(() => {
    const sources = [
      new Ros1UnavailableDataSourceFactory(),
      new Ros1LocalBagDataSourceFactory(),
      new Ros2UnavailableDataSourceFactory(),
      new Ros2LocalBagDataSourceFactory(),
      new FoxgloveWebSocketDataSourceFactory(),
      new RosbridgeDataSourceFactory(),
      new UlogLocalDataSourceFactory(),
      new VelodyneUnavailableDataSourceFactory(),
      new FoxgloveDataPlatformDataSourceFactory(consoleApi),
      new SampleNuscenesDataSourceFactory(),
      new McapLocalDataSourceFactory(),
      new RemoteDataSourceFactory(),
    ];

    return sources;
  }, [consoleApi]);

  // Enable dialog auth in development since using cookie auth does not work between
  // localhost and the hosted dev deployment due to browser cookie/host security.
  const enableDialogAuth =
    process.env.NODE_ENV === "development" || process.env.FOXGLOVE_ENABLE_DIALOG_AUTH != undefined;

  const disableSignin = process.env.FOXGLOVE_DISABLE_SIGN_IN != undefined;

  return (
    <>
      <App
        disableSignin={disableSignin}
        enableDialogAuth={enableDialogAuth}
        enableLaunchPreferenceScreen
        deepLinks={[window.location.href]}
        dataSources={dataSources}
        appConfiguration={appConfiguration}
        layoutStorage={layoutStorage}
        consoleApi={consoleApi}
        extensionLoaders={extensionLoaders}
        enableGlobalCss
      />
    </>
  );
}
