// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { NstrumentaBrowserClient } from "nstrumenta/dist/browser/client";
import React from "react";

export enum NstrumentaFoxgloveDataTypes {
  MCAP = "mcap",
  MP4 = "mp4",
  JSON = "json",
}

export interface NstrumentaFoxgloveData {
  mp4?: Blob;
  json?: Record<string, unknown>;
  mcap?: Blob;
  [key: string]: unknown;
}

export interface NstrumentaContextType {
  nstrumentaClient: NstrumentaBrowserClient;
  tag: string;
  handleUpdateNstrumenta: (tag: string) => void;
  showModal: boolean;
  data: NstrumentaFoxgloveData;
}

const NstrumentaContext = React.createContext<NstrumentaContextType | undefined>(undefined);
NstrumentaContext.displayName = "NstrumentaContext";

export function useNstrumentaProjectData(): NstrumentaContextType {
  const context = React.useContext(NstrumentaContext);
  if (context == undefined) {
    throw new Error("useNstrumentaProjectData must be used within a NstrumentaContext Provider");
  }
  return context;
}

export default NstrumentaContext;
