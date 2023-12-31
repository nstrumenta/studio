// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { FirebaseApp, initializeApp } from 'firebase/app';
import { Auth, GithubAuthProvider, User, getAuth, onAuthStateChanged, signInWithRedirect } from 'firebase/auth';
import { FirebaseStorage, getStorage } from 'firebase/storage';
import { ReactNode, useContext, useEffect, useState } from "react";

import {
  NstrumentaContext,
  NstrumentaExperiment,
} from "@foxglove/studio-base/context/NstrumentaContext";

export type FirebaseInstance = { app: FirebaseApp, storage: FirebaseStorage, auth: Auth, user?: User }

export default function NstrumentaProvider({ children }: { children?: ReactNode }): JSX.Element {
  const { nstClient } = useContext(NstrumentaContext);

  const { search } = window.location;

  const firebaseProjectId = new URLSearchParams(search).get("firebaseProjectId") ?? "";

  const firebaseConfigPath =
    `https://storage.googleapis.com/${firebaseProjectId}-config/firebaseConfig.json`;


  const [experiment, setExperiment] = useState<NstrumentaExperiment>();

  const [firebaseInstance, setFirebaseInstance] = useState<FirebaseInstance>();
  const fetchExperiment = async () => {
    //TODO getDownloadUrl from firebase
    // const url = '';
    // const fetchedExperiment: NstrumentaExperiment = await (await fetch(url)).json();
    // console.log(fetchedExperiment)
    // setExperiment(fetchedExperiment);
  };

  const saveExperiment = async () => {
    const stringified = JSON.stringify(experiment)!;
    //TODO upload experiment
    console.log(stringified)
  };
  const [nstrumentaState, setNstrumentaState] = useState({ experiment, setExperiment, saveExperiment, fetchExperiment, nstClient, firebaseInstance })

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

  const init = async () => {
    await fetchExperiment();
    await fetchConfig();
  };

  useEffect(() => {
    void init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    console.log(firebaseInstance?.user)
    setNstrumentaState({ ...nstrumentaState, firebaseInstance })
  }, [firebaseInstance])

  return (
    <NstrumentaContext.Provider
      value={nstrumentaState}
    >
      {children}
    </NstrumentaContext.Provider>
  );
}
