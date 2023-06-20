// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { JSONType } from "material-jsoneditor";
import { ReactNode, useContext, useEffect, useState } from "react";

import { NstrumentaContext } from "@foxglove/studio-base/context/NstrumentaContext";

export default function NstrumentaProvider({ children }: { children?: ReactNode }): JSX.Element {
  const { nstClient } = useContext(NstrumentaContext);

  const { search } = window.location;
  const dataIdParam = new URLSearchParams(search).get("dataId") ?? "";

  const [experiment, setExperiment] = useState<JSONType>();

  const fetchExperiment = async () => {
    const query = await nstClient.storage.query({
      field: "dataId",
      comparison: "==",
      compareValue: dataIdParam,
    });
    if (query[0] == undefined) {
      return;
    }
    const url = await nstClient.storage.getDownloadUrl(query[0].filePath);
    const fetchedExperiment: JSONType = await (await fetch(url)).json();
    setExperiment(fetchedExperiment);
  };

  const saveExperiment = async (exp: JSONType) => {
    const stringified = JSON.stringify(exp)!;

    const data = new Blob([stringified], {
      type: "application/json",
    });
    await nstClient.storage.upload({
      dataId: dataIdParam,
      data,
      filename: "experiment.json",
      meta: {},
      overwrite: true,
    });
    setExperiment(exp);
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
      value={{ experiment, setExperiment: saveExperiment, fetchExperiment, nstClient }}
    >
      {children}
    </NstrumentaContext.Provider>
  );
}
