// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { createContext, useContext } from "react";

import { FirebaseInstance } from "@foxglove/studio-base/providers/NstrumentaProvider";

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

export interface INstrumentaContext {
  firebaseInstance?: FirebaseInstance;
  experiment?: NstrumentaExperiment;
  userProjects?: string[];
  projectId?: string;
  setProjectId?: (projectId: string) => void
  setExperiment?: (experiment: NstrumentaExperiment) => void;
  setExperimentPath?: (experimentPath: string) => void;
  fetchExperiment?: () => void;
  saveExperiment?: () => void;
}

const NstrumentaContext = createContext<INstrumentaContext | undefined>(undefined);
NstrumentaContext.displayName = "NstrumentaContext";

export function useNstrumentaContext(): INstrumentaContext {
  const nstrumentaContext = useContext(NstrumentaContext);
  if (nstrumentaContext) {
    return nstrumentaContext;
  }
  else {
    return {}
  }
}


import { GithubAuthProvider, signInWithPopup, type User } from "firebase/auth";
export interface CurrentUser {
  currentUser: User | undefined;
  signIn: () => void;
  signOut?: () => Promise<void>;
}

export function useCurrentUser(): CurrentUser {
  const nstrumentaContext = useContext(NstrumentaContext);
  if (nstrumentaContext) {
    const { firebaseInstance } = nstrumentaContext;
    return {
      currentUser: firebaseInstance?.user, signIn: () => {
        firebaseInstance?.auth &&
          signInWithPopup(firebaseInstance.auth, new GithubAuthProvider())
      }, signOut: async () => { firebaseInstance?.auth && firebaseInstance?.auth.signOut() }
    }
  }
  else { return { currentUser: undefined, signIn: () => { } } }
}

export { NstrumentaContext };
