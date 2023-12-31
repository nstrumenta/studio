// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { NstrumentaBrowserClient } from "nstrumenta/dist/browser/client";
import { createContext, useContext } from "react";

import { FirebaseInstance } from "@foxglove/studio-base/providers/NstrumentaProvider";

const { search } = window.location;
const apiKeyParam = new URLSearchParams(search).get("apiKey");
const apiLocalStore = localStorage.getItem("apiKey");
const apiKey = apiKeyParam
  ? apiKeyParam
  : apiLocalStore
    ? apiLocalStore
    : (prompt("Enter your nstrumenta apiKey") as string);
if (apiKey) {
  localStorage.setItem("apiKey", apiKey);
}

const nstClient = new NstrumentaBrowserClient(apiKey);

export type NstrumentaVideo = {
  name: string;
  filePath: string;
  startTime?: number;
  offset?: number;
  rotate?: number;
};

export type NstrumentaLabels = {
  filePath: string;
};

export type NstrumentaExperiment = {
  experimentFilepath: string;
  dataFilePath: string;
  layoutFilePath: string;
  labelFiles: NstrumentaLabels[];
  videos: NstrumentaVideo[];
};

interface INstrumentaContext {
  nstClient: NstrumentaBrowserClient;
  firebaseInstance?: FirebaseInstance;
  experiment?: NstrumentaExperiment;
  setExperiment?: (experiment: NstrumentaExperiment) => void;
  saveExperiment?: () => void;
  fetchExperiment?: () => void;
}

const NstrumentaContext = createContext<INstrumentaContext>({ nstClient });
NstrumentaContext.displayName = "NstrumentaContext";

export function useNstrumentClient(): NstrumentaBrowserClient {
  return useContext(NstrumentaContext).nstClient;
}

export function useNstrumentaContext(): INstrumentaContext {
  return useContext(NstrumentaContext);
}


import { GithubAuthProvider, signInWithPopup, type User } from "firebase/auth";
export interface CurrentUser {
  currentUser: User | undefined;
  signIn: () => void;
  signOut?: () => Promise<void>;
}

export function useCurrentUser(): CurrentUser {
  const { firebaseInstance } = useContext(NstrumentaContext);
  return {
    currentUser: firebaseInstance?.user, signIn: () => {
      firebaseInstance?.auth &&
        signInWithPopup(firebaseInstance.auth, new GithubAuthProvider())
    }, signOut: async () => { firebaseInstance?.auth && firebaseInstance?.auth.signOut() }
  }
}

export { NstrumentaContext };
