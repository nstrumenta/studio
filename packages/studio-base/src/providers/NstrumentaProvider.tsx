// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { FirebaseApp, initializeApp } from 'firebase/app';
import { Auth, GithubAuthProvider, User, getAuth, onAuthStateChanged, signInWithRedirect } from 'firebase/auth';
import { FirebaseStorage, getDownloadURL, getStorage, ref, uploadString } from 'firebase/storage';

import { ReactNode, useEffect, useState } from "react";

import {
  INstrumentaContext,
  NstrumentaContext,
  NstrumentaExperiment,
} from "@foxglove/studio-base/context/NstrumentaContext";
import { collection, getFirestore, onSnapshot } from 'firebase/firestore';

export type FirebaseInstance = { app: FirebaseApp, storage: FirebaseStorage, auth: Auth, user?: User }

export default function NstrumentaProvider({ children }: { children?: ReactNode }): JSX.Element {

  const { search } = window.location;

  const experimentParam = new URLSearchParams(search).get("experiment") ?? "";
  const nstrumentaOrg = new URLSearchParams(search).get("org") ?? "";

  const firebaseConfigPath =
    `https://storage.googleapis.com/${nstrumentaOrg}-config/firebaseConfig.json`;


  const [experiment, setExperiment] = useState<NstrumentaExperiment>();

  const [firebaseInstance, setFirebaseInstance] = useState<FirebaseInstance>();

  const [experimentPath, setExperimentPath] = useState<string>();

  const [userProjects, setUserProjects] = useState<string[]>();

  const [projectId, setProjectId] = useState<string>();

  const fetchExperiment = async () => {
    if (firebaseInstance == undefined || experimentPath == undefined) return;

    const experimentUrl = await getDownloadURL(ref(firebaseInstance.storage, experimentPath))
    const experiment = await (await fetch(experimentUrl)).json();

    setExperiment(experiment);
  }

  const saveExperiment = async () => {
    const stringified = JSON.stringify(experiment)!;
    if (firebaseInstance) {

      uploadString(ref(firebaseInstance.storage, experimentPath), stringified);
      console.log('uploading experiment', experimentPath, stringified)
    }

  };
  const [nstrumentaState, setNstrumentaState] = useState<INstrumentaContext>()

  const fetchConfig = async () => {
    const fetchedFirebaseConfig = await (await fetch(firebaseConfigPath)).json();
    console.log(fetchedFirebaseConfig);
    const app = initializeApp(fetchedFirebaseConfig);
    const storage = getStorage(app);
    const auth = getAuth(app);
    const db = getFirestore(app);


    onAuthStateChanged(auth, nextUser => {
      if (nextUser) {
        setFirebaseInstance({ app, storage, auth, user: nextUser })

        onSnapshot(collection(db, `users/${nextUser.uid}/projects`), (querySnapshot) => {
          const newData: string[] = [];
          querySnapshot.forEach((doc) => {
            newData.push(doc.id);
          });
          setUserProjects(newData);
        })
      }
      else {
        setFirebaseInstance({ app, storage, auth, user: undefined })
        signInWithRedirect(auth, new GithubAuthProvider())
      }
    })
  };


  const init = async () => {
    await fetchConfig();
  };

  useEffect(() => {
    if (experimentParam) {
      setProjectId(experimentParam.split('/')[1])
    }
    void init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (experimentPath) {
      const url = new URL(window.location.href);
      url.searchParams.set('experiment', experimentPath);
      // Replace the current state in the history without triggering a page reload
      history.replaceState(null, '', url.toString());
    }
  }, [experimentPath]);

  useEffect(() => {
    if (firebaseInstance) {
      setNstrumentaState({ projectId, setProjectId, experiment, userProjects, setExperimentPath, fetchExperiment, setExperiment, saveExperiment, firebaseInstance })
    }
  }, [experiment, userProjects, projectId, setProjectId, firebaseInstance])

  return (
    <NstrumentaContext.Provider
      value={nstrumentaState}
    >
      {children}
    </NstrumentaContext.Provider>
  );
}
