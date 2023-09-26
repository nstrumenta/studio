// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { ReactNode, useContext, useEffect, useState } from "react";

import {
  NstrumentaContext,
  NstrumentaExperiment,
} from "@foxglove/studio-base/context/NstrumentaContext";

export default function NstrumentaProvider({ children }: { children?: ReactNode }): JSX.Element {
  const { nstClient } = useContext(NstrumentaContext);

  const { search } = window.location;
  const filePath = new URLSearchParams(search).get("experiment") ?? "";

  const [experiment, setExperiment] = useState<NstrumentaExperiment>();

  const fetchExperiment = async () => {
    const url = await nstClient.storage.getDownloadUrl(filePath);
    const fetchedExperiment: NstrumentaExperiment = await (await fetch(url)).json();
    setExperiment(fetchedExperiment);
  };

  const saveExperiment = async () => {
    const stringified = JSON.stringify(experiment)!;
    const filename =
      filePath.split("/")[0] === "projects" ? filePath.split("/").slice(3).join("/") : filePath;

    const data = new Blob([stringified], {
      type: "application/json",
    });
    await nstClient.storage.upload({
      data,
      filename,
      meta: {},
      overwrite: true,
    });
  };

  const init = async () => {
    await fetchExperiment();
  };

  useEffect(() => {
    void init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <NstrumentaContext.Provider
      value={{ experiment, setExperiment, saveExperiment, fetchExperiment, nstClient }}
    >
      {children}
    </NstrumentaContext.Provider>
  );
}
