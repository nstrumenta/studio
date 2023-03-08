// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/
/* eslint-disable no-restricted-syntax */

// import { Theme } from "@mui/material";
import { styled, keyframes } from "@mui/material/styles";
import { NstrumentaBrowserClient } from "nstrumenta/dist/browser/client";
import React, {
  StrictMode,
  useState,
  useEffect,
  useRef,
  useLayoutEffect,
  useCallback,
} from "react";
import ReactDOM from "react-dom";

import { CompressedImage } from "@foxglove/schemas";
import type { PanelExtensionContext, RenderState, Time, Topic } from "@foxglove/studio";
import Panel from "@foxglove/studio-base/components/Panel";
import { PanelExtensionAdapter } from "@foxglove/studio-base/components/PanelExtensionAdapter";
// import NstrumentaContext from "@foxglove/studio-base/context/NstrumentaContext";
import {
  NstrumentaContextType,
  NstrumentaFoxgloveData,
} from "@foxglove/studio-base/context/NstrumentaContext";
import { usePlayerSelection } from "@foxglove/studio-base/context/PlayerSelectionContext";
import ThemeProvider from "@foxglove/studio-base/theme/ThemeProvider";
import type { SaveConfig } from "@foxglove/studio-base/types/panels";
import { fonts } from "@foxglove/studio-base/util/sharedStyleConstants";

type ImageMessage = MessageEvent<CompressedImage>;

type PanelState = {
  topic?: string;
};

const nstrumentaClient = new NstrumentaBrowserClient();
const defaultNstrumentaData: NstrumentaContextType = {
  nstrumentaClient,
  tag: "",
  handleUpdateNstrumenta: () => {},
  showModal: false,
  data: {},
};

const Root = styled("div")(() => ({
  display: "flex",
  flexDirection: "column",
  height: "100%",
  width: "100%",
  padding: "1em",
  justifyContent: "center",
  fontFamily: fonts.MONOSPACE,
  alignItems: "center",
}));

const Debug = styled("div")(() => ({
  display: "flex",
  position: "absolute",
  flexDirection: "column",
  bottom: 0,
  right: 0,
  opacity: 0.5,
  padding: "1em",
  backgroundColor: "darkblue",
  justifyContent: "center",
}));

const Footer = styled("div")(() => ({
  display: "flex",
  position: "absolute",
  flexDirection: "column",
  bottom: 0,
  left: 0,
  right: 0,
  padding: "1em",
  alignItems: "center",
}));

const Overlay = styled("div")<{ dataIsFetching: boolean }>(({ dataIsFetching }) => ({
  display: dataIsFetching ? "flex" : "none",
  position: "absolute",
  flexDirection: "column",
  bottom: 0,
  right: 0,
  top: 0,
  left: 0,
  justifyContent: "center",
  backgroundColor: "rgba(0,0,0,0.5)",
  alignItems: "center",
  pointerEvents: "none",
}));

const rotate360 = keyframes`
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
`;

const Spinner = styled("div")(() => ({
  animation: `${rotate360} 1s linear infinite`,
  transform: `translateZ(0)`,
  "border-top": `2px solid rgba(255, 255, 255, 0.2)`,
  "border-right": `2px solid rgba(255, 255, 255, 0.2)`,
  "border-bottom": `2px solid rgba(255, 255, 255, 0.2)`,
  "border-left": `2px solid #ffffff`,
  background: `transparent`,
  width: `24px`,
  height: `24px`,
  borderRadius: `50%`,
}));

// Draws the compressed image data into our canvas.
async function drawImageOnCanvas(imgData: Uint8Array, canvas: HTMLCanvasElement, format: string) {
  const ctx = canvas.getContext("2d");

  // Create a bitmap from our raw compressed image data.
  const blob = new Blob([imgData], { type: `image/${format}` });
  const bitmap = await createImageBitmap(blob);

  // Adjust for aspect ratio.

  canvas.width = Math.round((canvas.height * bitmap.width) / bitmap.height);

  // Draw the image.
  ctx!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  ctx!.resetTransform();
}

export const VideoPanel = ({ context }: { context: PanelExtensionContext }): JSX.Element => {
  // panel extensions must notify when they've completed rendering
  // onRender will setRenderDone to a done callback which we can invoke after we've rendered
  const [topics, setTopics] = useState<readonly Topic[] | undefined>();
  const [message, setMessage] = useState<ImageMessage>();
  const [allFrames, setAllFrames] = useState<MessageEvent<unknown>[]>([]);
  const [currentTime, setCurrentTime] = useState<Time>({ sec: 0, nsec: 0 });
  const [renderDone, setRenderDone] = useState<(() => void) | undefined>();
  const [nstrumentaData, setNstrumentaData] =
    useState<NstrumentaContextType>(defaultNstrumentaData);
  const [dataIsFetching, setDataIsFetching] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  const inputRef = React.useRef<HTMLInputElement>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Restore our state from the layout via the context.initialState property.
  const [state, setState] = useState<PanelState>(() => context.initialState as PanelState);

  // const { data: nstrumentaData, handleUpdateNstrumenta } =
  //   React.useContext(NstrumentaContext) ?? {};

  // Filter all of our topics to find the ones with a CompresssedImage message.
  const imageTopics = (topics ?? []).filter((topic) => {
    return [
      "ACCEL_RAW",
      "MAXWELL",
      "GYRO_RAW",
      "START",
      "START_VIDEO",
      "TIMESTAMP_FULL",
      "STOP",
    ].includes(topic.name);
  });

  const { selectSource } = usePlayerSelection();

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (event.key === "d" && event.ctrlKey) {
        console.log("toggle debug");
        setShowDebug((prev) => !prev);
      }
    };

    document.addEventListener("keydown", listener);
    return () => {
      document.removeEventListener("keydown", listener);
    };
  }, []);

  useEffect(() => {
    nstrumentaClient
      .connect({ wsUrl: "wss://foxglove-test-lceup5dmo5k4rnhtj4vz.vm.nstrumenta.com" })
      .then(() => {
        setNstrumentaData((prevData) => {
          return { ...prevData, client: nstrumentaClient };
        });
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (nstrumentaData.data.mp4) {
      const video = videoRef.current;
      if (video) {
        const blobUrl = URL.createObjectURL(nstrumentaData.data.mp4);
        video.src = blobUrl;
      }
    }
  }, [nstrumentaData.data.mp4]);

  useEffect(() => {
    if (nstrumentaData.data.mcap) {
      const video = videoRef.current;
      if (video) {
        const file = new File([nstrumentaData.data.mcap], "nstrumenta.mcap");
        selectSource("nstrumenta", { type: "file", files: [file] });
      }
    }
  }, [nstrumentaData.data.mcap, selectSource]);

  useEffect(() => {
    // Save our state to the layout when the topic changes.
    context.saveState({ topic: state.topic });

    if (state.topic) {
      console.log("subscribing to", state.topic);
      // Subscribe to the new image topic when a new topic is chosen.
      context.subscribe([state.topic]);
    }
  }, [context, state.topic]);

  // Choose our first available image topic as a default once we have a list of topics available.
  useEffect(() => {
    const savedTopicIsExistsInCurrentDataSource = Boolean(
      imageTopics.find((topic) => topic.name === state.topic),
    );
    if (state.topic == undefined || !savedTopicIsExistsInCurrentDataSource) {
      setState({ topic: imageTopics[0]?.name });
    }
  }, [state.topic, imageTopics]);

  // Every time we get a new image message draw it to the canvas.
  useEffect(() => {
    if (message) {
      console.log("message", message);
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      drawImageOnCanvas(message.message.data, canvasRef.current!, message.message.format).catch(
        (error) => console.log(error),
      );
    }
  }, [message]);

  // Set up our onRender function and start watching topics and currentFrame for messages.
  useLayoutEffect(() => {
    context.onRender = (renderState: RenderState, done) => {
      setRenderDone(() => done);
      setTopics(renderState.topics);

      // Save the most recent message on our image topic.
      if (renderState.currentFrame && renderState.currentFrame.length > 0) {
        setMessage(
          renderState.currentFrame[renderState.currentFrame.length - 1] as unknown as ImageMessage,
        );
        setCurrentTime(renderState.currentFrame[renderState.currentFrame.length - 1]!.receiveTime);
      }

      if (renderState.allFrames) {
        setAllFrames(renderState.allFrames as unknown as MessageEvent<unknown>[]);
      }
    };

    context.watch("topics");
    context.watch("currentFrame");
    context.watch("allFrames");
  }, [context]);

  // Call our done function at the end of each render.
  useEffect(() => {
    renderDone?.();
  }, [renderDone]);

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) {
      return;
    }
    const [file] = Array.from(event.target.files);
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result;
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      if (!data || !videoRef.current) {
        return;
      }
      const blob = new Blob([new Uint8Array(data as ArrayBuffer)], { type: file?.type });
      const source = document.createElement("source");
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition
      source.setAttribute("src", (window.URL || window.webkitURL).createObjectURL(blob));
      videoRef.current.appendChild(source);
      videoRef.current.load();
    };
    reader.readAsArrayBuffer(file as File);
  }, []);

  const handleUpdateNstrumenta = React.useCallback(async () => {
    console.log("handleUpdateNstrumenta", nstrumentaData.tag);
    const data: NstrumentaFoxgloveData = {};
    const queryResponse =
      (await nstrumentaClient.storage?.query({
        tag: nstrumentaData.tag ? [nstrumentaData.tag] : undefined,
      })) ?? [];

    for (const result of queryResponse) {
      const filetype = result.filePath.split(".").pop()?.toLocaleLowerCase();
      let blob: Blob | undefined;
      const path = result.filePath.replace(/^projects\/[^/]+\//, "");
      switch (filetype) {
        case "json":
          setDataIsFetching(true);
          blob = await nstrumentaClient.storage?.download(path);
          data.json = await new Response(blob).json();
          setDataIsFetching(false);
          break;
        case "mcap":
          setDataIsFetching(true);
          data.mcap = await nstrumentaClient.storage?.download(path);
          setDataIsFetching(false);
          break;
        case "mp4":
          setDataIsFetching(true);
          data.mp4 = await nstrumentaClient.storage?.download(path);
          setDataIsFetching(false);
          break;
        default:
          break;
      }
    }

    setNstrumentaData((prev) => ({
      ...prev,
      data,
    }));
    return data;
  }, [nstrumentaData.tag]);

  // handleUpdateNstrumenta starts as undefined on mount, so we need to set it's defined
  useEffect(() => {
    setNstrumentaData((prev) => ({
      ...prev,
      handleUpdateNstrumenta,
    }));
  }, [handleUpdateNstrumenta]);

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const start = allFrames[0] ? allFrames[0].receiveTime : { sec: 0, nsec: 0 };
  // const end = allFrames[allFrames.length - 1]
  //   ? // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //     // @ts-ignore
  //     allFrames[allFrames.length - 1]!.receiveTime
  //   : { sec: 0, nsec: 0 };
  const currentTimestamp = currentTime.sec * 1000 + currentTime.nsec / 1000000;
  // duration = end?.sec * 1000 + end?.nsec / 1000000 - (start?.sec * 1000 + start?.nsec / 1000000);
  const currentOffset = currentTimestamp - (start.sec * 1000 + start.nsec / 1000000);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = currentOffset / 1000;
    }
  }, [currentOffset]);

  return (
    <Root>
      <Overlay dataIsFetching={dataIsFetching}>
        <Spinner />
        Fetching data
      </Overlay>
      <video ref={videoRef} autoPlay={false} />
      <Footer>
        <div className="card">
          <button type="button" onClick={handleClick} name="upload">
            open video file
          </button>
          <input
            type="file"
            aria-label="add files"
            ref={inputRef}
            multiple={false}
            onChange={handleChange}
            style={{ display: "none" }}
          />

          <button
            type="button"
            onClick={() => {
              const tag = prompt("enter data tag", nstrumentaData.tag);
              if (tag) {
                nstrumentaData.handleUpdateNstrumenta(tag);
              }
            }}
          >
            Update data tag
          </button>
        </div>
        <div className="copyright">Copyright © 2022 PNI Sensor</div>
      </Footer>
      {showDebug && (
        <Debug>
          <div>current offset: {Math.floor(currentOffset)}</div>
          <div>allFrame length: {allFrames.length}</div>
          <div>currentTimestamp: {currentTimestamp}</div>
          <div>
            Topics:
            {topics && (
              <ul>
                {topics.map((topic) => (
                  <li key={topic.name}>{topic.name}</li>
                ))}
              </ul>
            )}
          </div>
        </Debug>
      )}
    </Root>
  );
};

class CustomErrorBoundary extends React.Component {
  public override state: { hasError: boolean };

  public constructor(props: Record<string, unknown>) {
    // if (props == undefined) {
    //   console.error("props is undefined");
    // }
    super(props);
    this.state = { hasError: false };
  }

  public static getDerivedStateFromError() {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  public override componentDidCatch(error: unknown, errorInfo: unknown) {
    // You can also log the error to an error reporting service

    console.log("FORT >", error, errorInfo);
  }

  public override render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <>
          <h1>Something went wrong.</h1>
          {this.props.children}
        </>
      );
    }

    return this.props.children;
  }
}

function initPanel(context: PanelExtensionContext) {
  ReactDOM.render(
    <StrictMode>
      <ThemeProvider isDark>
        <CustomErrorBoundary>
          <VideoPanel context={context} />
        </CustomErrorBoundary>
      </ThemeProvider>
    </StrictMode>,
    context.panelElement,
  );
  return () => {
    ReactDOM.unmountComponentAtNode(context.panelElement);
  };
}

type Config = unknown;

type Props = {
  config: Config;
  saveConfig: SaveConfig<Config>;
};

const VideoPanelAdapter = (props: Props) => (
  <PanelExtensionAdapter
    config={props.config}
    saveConfig={props.saveConfig}
    initPanel={initPanel}
  />
);

VideoPanelAdapter.panelType = "FORT";
VideoPanelAdapter.defaultConfig = {};

export default Panel(VideoPanelAdapter);
