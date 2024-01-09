// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { useEffect, useMemo, useState } from "react";

import {
  App,
  AppSetting,
  IDataSourceFactory,
  IdbExtensionLoader,
  McapLocalDataSourceFactory,
  NstrumentaDataSourceFactory
} from "@foxglove/studio-base";

import { IdbLayoutStorage } from "./services/IdbLayoutStorage";
import LocalStorageAppConfiguration from "./services/LocalStorageAppConfiguration";

import { FirebaseApp, initializeApp } from 'firebase/app';
import { Auth, GithubAuthProvider, User, getAuth, onAuthStateChanged, signInWithRedirect } from 'firebase/auth';
import { FirebaseStorage, getStorage } from 'firebase/storage';


const isDevelopment = process.env.NODE_ENV === "development";

export type FirebaseInstance = { app: FirebaseApp, storage: FirebaseStorage, auth: Auth, user?: User }

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


  const { search } = window.location;

  const nstrumentaOrg = new URLSearchParams(search).get("nstrumentaOrg") ?? "";


  const firebaseConfigPath =
    `https://storage.googleapis.com/${nstrumentaOrg}-config/firebaseConfig.json`;

  const [firebaseInstance, setFirebaseInstance] = useState<FirebaseInstance>();

  const fetchConfig = async () => {
    const fetchedFirebaseConfig = await (await fetch(firebaseConfigPath)).json();
    console.log(fetchedFirebaseConfig);
    const app = initializeApp(fetchedFirebaseConfig);
    const storage = getStorage(app);
    const auth = getAuth(app);


    onAuthStateChanged(auth, nextUser => {
      if (nextUser) { setFirebaseInstance({ app, storage, auth, user: nextUser }) }
      else {
        setFirebaseInstance({ app, storage, auth, user: undefined })
        signInWithRedirect(auth, new GithubAuthProvider())
      }
    })
  };

  const dataSources = useMemo(() => {
    if (!firebaseInstance) return [];
    const sources = [
      new McapLocalDataSourceFactory(),
      new NstrumentaDataSourceFactory(firebaseInstance),
    ];

    return props.dataSources ?? sources;
  }, [firebaseInstance, props.dataSources]);

  const init = async () => {
    await fetchConfig();
  };

  useEffect(() => {
    void init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <>
      <App
        enableLaunchPreferenceScreen
        deepLinks={[window.location.href]}
        dataSources={dataSources}
        appConfiguration={appConfiguration}
        layoutStorage={layoutStorage}
        extensionLoaders={extensionLoaders}
        enableGlobalCss
        extraProviders={props.extraProviders}
      />
    </>
  );
}
