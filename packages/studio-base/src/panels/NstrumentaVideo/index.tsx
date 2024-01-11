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

import Button from "@mui/material/Button";
import { LegacyRef, useCallback, useEffect, useRef, useState } from "react";

import { fromMillis, toSec } from "@foxglove/rostime";
import {
  MessagePipelineContext,
  useMessagePipeline,
} from "@foxglove/studio-base/components/MessagePipeline";
import Panel from "@foxglove/studio-base/components/Panel";
import { usePanelContext } from "@foxglove/studio-base/components/PanelContext";
import PanelToolbar from "@foxglove/studio-base/components/PanelToolbar";
import { NumberInput } from "@foxglove/studio-base/components/SettingsTreeEditor/inputs/NumberInput";
import Stack from "@foxglove/studio-base/components/Stack";
import {
  useNstrumentaContext,
} from "@foxglove/studio-base/context/NstrumentaContext";
import { subtractTimes } from "@foxglove/studio-base/players/UserNodePlayer/nodeTransformerWorker/typescript/userUtils/time";
import { SaveConfig } from "@foxglove/studio-base/types/panels";

import { NstrumentaVideoConfig, useNstrumentaVideoSettings } from "./settings";

import { getDownloadURL, ref } from "firebase/storage";

type Props = {
  config: NstrumentaVideoConfig;
  saveConfig: SaveConfig<NstrumentaVideoConfig>;
};

function NstrumentaVideoPanel(props: Props): JSX.Element {
  const { config, saveConfig } = props;
  const { videoName } = config;

  const [videoFilePath, setVideoFilePath] = useState<string | undefined>(undefined);
  const [videoUrl, setVideoUrl] = useState<string | undefined>(undefined);
  const [timeOutsideOfPlayback, setTimeOutsideOfPlayback] = useState(0);
  const [offsetInput, setOffsetInput] = useState<number | undefined>();

  const videoRef = useRef<HTMLVideoElement>();

  const activeData = useMessagePipeline((ctx: MessagePipelineContext) => {
    return ctx.playerState.activeData;
  });

  const panelContext = usePanelContext();
  const filePath = videoFilePath?.split("/").slice(3).join("/");
  panelContext.title = filePath ? `${videoName}: ${filePath}` : "Nstrumenta Video";

  const { experiment, setExperiment, saveExperiment } = useNstrumentaContext();
  const nstrumentaVideoIndex = experiment?.videos.findIndex((v) => v.name === videoName);
  const nstrumentaVideo =
    nstrumentaVideoIndex != undefined ? experiment?.videos[nstrumentaVideoIndex] : undefined;

  const { firebaseInstance } = useNstrumentaContext()

  useNstrumentaVideoSettings(config, saveConfig);

  const getVideoUrl = useCallback(
    async (dataId: string) => {
      if (!firebaseInstance) return;


      const url = await getDownloadURL(ref(firebaseInstance.storage, dataId));
      setVideoUrl(url);
    },
    [firebaseInstance],
  );

  useEffect(() => {
    setOffsetInput(nstrumentaVideo?.offset)
  }, [nstrumentaVideo?.offset])

  useEffect(() => {
    if (videoRef.current && activeData) {
      const video = videoRef.current;
      const { startTime, currentTime, isPlaying, speed } = activeData;
      if (!nstrumentaVideo) {
        return;
      }
      setVideoFilePath(nstrumentaVideo.filePath);
      const videoStartTime = nstrumentaVideo.startTime ?? 0;
      const videoFineTuneOffset = offsetInput ? offsetInput : nstrumentaVideo.offset ?? 0;
      const offset = toSec(
        subtractTimes(fromMillis(videoStartTime + videoFineTuneOffset), startTime),
      );
      const videoPlaying =
        video.currentTime > 0 &&
        !video.paused &&
        !video.ended &&
        video.readyState > video.HAVE_CURRENT_DATA;

      const videoCurrentTime = toSec(subtractTimes(currentTime, startTime)) - offset;
      if (videoCurrentTime < 0) {
        setTimeOutsideOfPlayback(videoCurrentTime);
      } else if (videoCurrentTime > video.duration) {
        setTimeOutsideOfPlayback(videoCurrentTime - video.duration);
      } else {
        setTimeOutsideOfPlayback(0);
      }

      if (isPlaying) {
        if (!videoPlaying) {
          video.playbackRate = speed;
          void video.play();
        }
      } else {
        if (videoPlaying) {
          video.pause();
        }
        video.currentTime = videoCurrentTime;
      }
    }
  }, [activeData, nstrumentaVideo, videoName, setVideoFilePath]);

  useEffect(() => {
    if (videoFilePath) {
      void getVideoUrl(videoFilePath);
    }
  }, [videoFilePath, getVideoUrl]);



  return (
    <Stack fullHeight>
      <PanelToolbar />
      {config.showFineTuning ? (
        <>
          {`Time(ms) outside playback: ${Math.round(1000 * timeOutsideOfPlayback)}\n`}
          {JSON.stringify(nstrumentaVideo)}
          <Stack direction="row">
            <NumberInput
              size="small"
              variant="filled"
              step={100}
              precision={0}
              value={offsetInput}
              fullWidth
              onChange={setOffsetInput}
            />
            <Button
              style={{ width: "fit-content", margin: "2px" }}
              variant="contained"
              color="inherit"
              title="Save Experiment to nstrumenta"
              onClick={() => {
                if (saveExperiment && setExperiment && experiment && nstrumentaVideo && offsetInput) {
                  experiment.videos[nstrumentaVideoIndex!] = { ...nstrumentaVideo, ...{ offset: Math.round(offsetInput) } };
                  setExperiment(experiment)
                  saveExperiment()
                }
              }}
            >
              Save
            </Button>
          </Stack>
        </>
      ) : (
        timeOutsideOfPlayback !== 0 && `Time(ms) outside playback: ${Math.round(1000 * timeOutsideOfPlayback)}\n`
      )}
      <video
        style={{
          height: "100%",
          width: "100%",
          objectFit: "contain",
          visibility: timeOutsideOfPlayback === 0 ? "visible" : "hidden",
          transform: nstrumentaVideo?.rotate ? `rotate(${nstrumentaVideo.rotate}deg) scale(1.77)` : undefined
        }}
        src={videoUrl}
        ref={videoRef as LegacyRef<HTMLVideoElement>}
      ></video>
    </Stack>
  );
}

const defaultConfig: NstrumentaVideoConfig = {
  title: "Nstrumenta Video",
  videoName: "",
  showFineTuning: false,
};

export default Panel(
  Object.assign(NstrumentaVideoPanel, {
    panelType: "nstrumentaVideo",
    defaultConfig,
  }),
);
