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

import { LegacyRef, useCallback, useEffect, useRef, useState } from "react";

import { toSec } from "@foxglove/rostime";
import {
  MessagePipelineContext,
  useMessagePipeline,
} from "@foxglove/studio-base/components/MessagePipeline";
import Panel from "@foxglove/studio-base/components/Panel";
import { usePanelContext } from "@foxglove/studio-base/components/PanelContext";
import PanelToolbar from "@foxglove/studio-base/components/PanelToolbar";
import Stack from "@foxglove/studio-base/components/Stack";
import {
  useNstrumentClient,
  useNstrumentaContext,
} from "@foxglove/studio-base/context/NstrumentaContext";
import { subtractTimes } from "@foxglove/studio-base/players/UserNodePlayer/nodeTransformerWorker/typescript/userUtils/time";
import { SaveConfig } from "@foxglove/studio-base/types/panels";

import { NstrumentaVideoConfig, useNstrumentaVideoSettings } from "./settings";

type Props = {
  config: NstrumentaVideoConfig;
  saveConfig: SaveConfig<NstrumentaVideoConfig>;
};

function NstrumentaVideoPanel(props: Props): JSX.Element {
  const { config, saveConfig } = props;
  const { videoFilePath } = config;

  const [videoUrl, setVideoUrl] = useState<string | undefined>(undefined);
  const videoRef = useRef<HTMLVideoElement>();

  const activeData = useMessagePipeline((ctx: MessagePipelineContext) => {
    return ctx.playerState.activeData;
  });

  const panelContext = usePanelContext();
  const name = videoFilePath?.split("/").slice(3).join("/");
  panelContext.title = name ?? "Nstrumenta Video";

  const { experiment } = useNstrumentaContext();

  const nstClient = useNstrumentClient();

  useNstrumentaVideoSettings(config, saveConfig);

  const getVideoUrl = useCallback(
    async (dataId: string) => {
      const query = (await nstClient.storage.query({
        field: "filePath",
        comparison: "==",
        compareValue: dataId,
      })) as { filePath: string }[];
      if (query[0] == undefined) {
        return;
      }
      const url = await nstClient.storage.getDownloadUrl(query[0].filePath);
      setVideoUrl(url);
    },
    [nstClient.storage],
  );

  useEffect(() => {
    if (videoRef.current && activeData) {
      const video = videoRef.current;
      const { startTime, currentTime, isPlaying, speed } = activeData;
      const offset = experiment?.videos.find((v) => v.filePath === videoFilePath)?.offset ?? 0;
      const videoPlaying =
        video.currentTime > 0 &&
        !video.paused &&
        !video.ended &&
        video.readyState > video.HAVE_CURRENT_DATA;

      if (isPlaying) {
        if (!videoPlaying) {
          video.playbackRate = speed;
          void video.play();
        }
      } else {
        if (videoPlaying) {
          video.pause();
        }
        video.currentTime = toSec(subtractTimes(currentTime, startTime)) - offset;
      }
    }
  }, [activeData, experiment?.videos, videoFilePath]);

  useEffect(() => {
    if (videoFilePath) {
      void getVideoUrl(videoFilePath);
    }
  }, [videoFilePath, nstClient, getVideoUrl]);

  return (
    <Stack fullHeight>
      <PanelToolbar />
      <video width="100%" src={videoUrl} ref={videoRef as LegacyRef<HTMLVideoElement>}></video>
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
