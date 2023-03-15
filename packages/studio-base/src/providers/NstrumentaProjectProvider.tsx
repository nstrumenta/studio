// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { NstrumentaBrowserClient } from "nstrumenta/dist/browser/client";
import { ClientStatus } from "nstrumenta/dist/shared";
import React, { PropsWithChildren } from "react";

import NstrumentaContext, {
  NstrumentaContextType,
  NstrumentaFoxgloveData,
} from "@foxglove/studio-base/context/NstrumentaContext";

export const NST_NAMESPACE = "nstrumenta__";

const BADBADBAD = "wss://foxglove-test-lceup5dmo5k4rnhtj4vz.vm.nstrumenta.com";

const nstrumentaClient: NstrumentaBrowserClient = new NstrumentaBrowserClient();
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
window.client = nstrumentaClient;

export default function NstrumentaProjectProvider(
  props: PropsWithChildren<unknown>,
): React.ReactElement {
  const [nstrumentaContextData, setData] = React.useState<NstrumentaContextType>({
    nstrumentaClient,
    tag: "",
    handleUpdateNstrumenta: () => {},
    showModal: false,
    data: {},
  });

  // eslint-disable-next-line no-restricted-syntax
  console.log(
    "nstrumentaClient.apiKey",
    nstrumentaContextData.nstrumentaClient.apiKey,
    nstrumentaClient,
  );

  React.useEffect(() => {
    // Set nstrumenta data tag from URL query params or localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const tagFromUrl = urlParams.get(`${NST_NAMESPACE}tag`);
    const tagFromStorage = localStorage.getItem(`${NST_NAMESPACE}tag`);

    if (tagFromUrl) {
      setData((prevData) => ({ ...prevData, tag: tagFromUrl }));
      localStorage.setItem(`${NST_NAMESPACE}tag`, tagFromUrl);
    } else if (tagFromStorage) {
      setData((prevData) => ({
        ...prevData,
        tag: tagFromStorage,
      }));
    } else {
      setData((prevData) => ({ ...prevData, tag: prompt("Enter a tag") ?? "" }));
    }
  }, []);

  const handleUpdateNstrumenta = React.useCallback(async (tag?: string) => {
    setData((prevData) => ({ ...prevData, tag: tag ?? prevData.tag }));
    if (tag) {
      localStorage.setItem(`${NST_NAMESPACE}tag`, tag);
    }
    await nstrumentaClient.connect();
    const queryResponse =
      (await nstrumentaClient.storage?.query({ tag: tag ? [tag] : undefined })) ?? [];

    const data: NstrumentaFoxgloveData = {};

    for (const result of queryResponse) {
      const filetype = result.filePath.split(".").pop()?.toLocaleLowerCase();
      let blob: Blob | undefined;
      switch (filetype) {
        case "json":
          blob = await nstrumentaClient.storage?.download(result.filePath);
          data.json = await new Response(blob).json();
          break;
        case "mcap":
          data.mcap = await nstrumentaClient.storage?.download(result.filePath);
          break;
        case "mp4":
          data.mp4 = await nstrumentaClient.storage?.download(result.filePath);
          break;
        default:
          break;
      }
    }

    return data;
  }, []);

  React.useEffect(() => {
    if (
      Boolean(nstrumentaClient) &&
      nstrumentaClient.connection.status === ClientStatus.CONNECTED
    ) {
      nstrumentaClient
        .shutdown()
        .then(() => {
          if (nstrumentaClient.apiKey) {
            nstrumentaClient
              .connect({
                apiKey: nstrumentaContextData.nstrumentaClient.apiKey ?? "",
                wsUrl: BADBADBAD,
              })
              .then(async () => {
                await handleUpdateNstrumenta();
              })
              .catch(console.error);
          }
        })
        .catch(console.error);
    } else {
      nstrumentaClient
        .connect({
          apiKey: nstrumentaContextData.nstrumentaClient.apiKey ?? "",
          wsUrl: BADBADBAD,
        })
        .then(async () => {
          await handleUpdateNstrumenta();
        })
        .catch(console.error);
    }
  }, [nstrumentaContextData.nstrumentaClient.apiKey, handleUpdateNstrumenta]);

  React.useEffect(() => {
    if (nstrumentaContextData.tag) {
      handleUpdateNstrumenta(nstrumentaContextData.tag)
        .then((data) => {
          setData((prevData) => ({ ...prevData, data }));
        })
        .catch(console.error);
    }
  }, [handleUpdateNstrumenta, nstrumentaContextData.tag]);

  const provider = React.useMemo(() => {
    return { ...nstrumentaContextData, handleUpdateNstrumenta };
  }, [nstrumentaContextData, handleUpdateNstrumenta]);

  return <NstrumentaContext.Provider value={provider}>{props.children}</NstrumentaContext.Provider>;
}
