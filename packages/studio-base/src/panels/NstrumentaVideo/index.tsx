// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/
//
// This file incorporates work covered by the following copyright and
// permission notice:
//
//   Copyright 2019-2021 Cruise LLC
//
//   This source code is licensed under the Apache License, Version 2.0,
//   found at http://www.apache.org/licenses/LICENSE-2.0
//   You may not use this file except in compliance with the License.

import { useEffect, useRef, useState } from "react";

import Stack from "@foxglove/studio-base/components/Stack";

import Panel from "@foxglove/studio-base/components/Panel";
import PanelToolbar from "@foxglove/studio-base/components/PanelToolbar";
import { SaveConfig } from "@foxglove/studio-base/types/panels";

import { toSec } from "@foxglove/rostime";
import {
  MessagePipelineContext,
  useMessagePipeline,
} from "@foxglove/studio-base/components/MessagePipeline";
import { useNstrumentaContext } from "@foxglove/studio-base/context/NstrumentaContext";
import { subtractTimes } from "@foxglove/studio-base/players/UserNodePlayer/nodeTransformerWorker/typescript/userUtils/time";
import { NstrumentaBrowserClient } from "nstrumenta/dist/browser/client";
import { NstrumentaVideoConfig, useNstrumentaVideoSettings } from "./settings";
import { usePanelContext } from "@foxglove/studio-base/components/PanelContext";

type Props = {
  config: NstrumentaVideoConfig;
  saveConfig: SaveConfig<NstrumentaVideoConfig>;
};

function NstrumentaVideoPanel(props: Props): JSX.Element {
  const { config, saveConfig } = props;
  const { videoFilePath } = config;

  const [videoUrl, setVideoUrl] = useState<string | undefined>(undefined);
  const videoRef = useRef<HTMLVideoElement>(null);

  const activeData = useMessagePipeline((ctx: MessagePipelineContext) => {
    return ctx.playerState.activeData;
  });

  const panelContext = usePanelContext();
  const name = videoFilePath?.split("/").slice(4).join("/");
  panelContext.title = name || "Nstrumenta Video";

  const nstClient = useNstrumentaContext() as NstrumentaBrowserClient;

  useNstrumentaVideoSettings(config, saveConfig);

  const getVideoUrl = async (dataId: string) => {
    const query = await nstClient.storage.query({
      field: "filePath",
      comparison: "==",
      compareValue: dataId,
    });
    console.log(query);
    if (query[0] === undefined) return;
    const videoUrl = await nstClient.storage.getDownloadUrl(query[0].filePath);
    setVideoUrl(videoUrl);
  };

  useEffect(() => {
    if (videoRef.current && activeData) {
      const { startTime, currentTime, isPlaying, speed } = activeData;
      if (isPlaying) {
        videoRef.current.playbackRate = speed;
        videoRef.current.play();
      } else {
        videoRef.current.pause();
        videoRef.current.currentTime = toSec(subtractTimes(currentTime, startTime));
      }
    }
  }, [activeData, videoRef.current]);

  useEffect(() => {
    if (videoFilePath && nstClient) {
      getVideoUrl(videoFilePath);
    }
  }, [videoFilePath, nstClient]);

  return (
    <Stack fullHeight>
      <PanelToolbar />
      <video width={"100%"} src={videoUrl} ref={videoRef}></video>
    </Stack>
  );
}

const defaultConfig: NstrumentaVideoConfig = {
  videoFilePath: "",
};

export default Panel(
  Object.assign(NstrumentaVideoPanel, {
    panelType: "nstrumentaVideo",
    defaultConfig,
  }),
);
