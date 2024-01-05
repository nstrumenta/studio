// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { useMemo, useState } from "react";

import {
  App,
  AppSetting,
  IDataSourceFactory,
  IdbExtensionLoader,
} from "@foxglove/studio-base";

import { IdbLayoutStorage } from "./services/IdbLayoutStorage";
import LocalStorageAppConfiguration from "./services/LocalStorageAppConfiguration";

const isDevelopment = process.env.NODE_ENV === "development";

export function Root(props: {
  extraProviders: JSX.Element[] | undefined;
  dataSources: IDataSourceFactory[] | undefined;
}): JSX.Element {
  const appConfiguration = useMemo(
    () =>
      new LocalStorageAppConfiguration({
        defaults: {
          [AppSetting.SHOW_DEBUG_PANELS]: isDevelopment,
        },
      }),
    [],
  );
  const layoutStorage = useMemo(() => new IdbLayoutStorage(), []);
  const [extensionLoaders] = useState(() => [
    new IdbExtensionLoader("org"),
    new IdbExtensionLoader("local"),
  ]);

  return (
    <App
      enableLaunchPreferenceScreen
      deepLinks={[window.location.href]}
      appConfiguration={appConfiguration}
      layoutStorage={layoutStorage}
      extensionLoaders={extensionLoaders}
      enableGlobalCss
      extraProviders={props.extraProviders}
    />
  );
}
