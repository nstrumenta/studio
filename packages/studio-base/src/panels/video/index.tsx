// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

/* eslint-disable @typescript-eslint/no-unnecessary-condition */
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

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
import { makeStyles } from "tss-react/mui";

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

const useStyles = makeStyles()((_, _params) => {
  return {
    root: {
      display: "flex",
      flexDirection: "column",
      height: "100%",
      width: "100%",
      padding: "1em",
      justifyContent: "center",
      fontFamily: fonts.MONOSPACE,
      alignItems: "center",
    },
    debug: {
      display: "flex",
      position: "absolute",
      flexDirection: "column",
      bottom: 0,
      right: 0,
      opacity: 0.5,
      padding: "1em",
      backgroundColor: "darkblue",
      justifyContent: "center",
    },
  };
});

// Draws the compressed image data into our canvas.
async function drawImageOnCanvas(imgData: Uint8Array, canvas: HTMLCanvasElement, format: string) {
  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  if (!canvas) {
    return;
  }
  const ctx = canvas.getContext("2d");
  // eslint-disable-next-line @foxglove/strict-equality
  if (ctx === undefined) {
    return;
  }

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
  const { cx, classes } = useStyles();
  const [topics, setTopics] = useState<readonly Topic[] | undefined>();
  const [message, setMessage] = useState<ImageMessage>();
  const [allFrames, setAllFrames] = useState<MessageEvent<unknown>[]>([]);
  const [currentTime, setCurrentTime] = useState<Time>({ sec: 0, nsec: 0 });
  const [renderDone, setRenderDone] = useState<(() => void) | undefined>();
  const [videoDimensions, setVideoDimensions] = useState({ width: 320, height: 200 });
  const [nstrumentaData, setNstrumentaData] =
    useState<NstrumentaContextType>(defaultNstrumentaData);

  // eslint-disable-next-line no-restricted-syntax
  const inputRef = React.useRef<HTMLInputElement>(null);
  // eslint-disable-next-line no-restricted-syntax
  const videoRef = React.useRef<HTMLVideoElement>(null);

  // eslint-disable-next-line no-restricted-syntax
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Restore our state from the layout via the context.initialState property.
  const [state, setState] = useState<PanelState>(() => context.initialState as PanelState);

  // const { data: nstrumentaData, handleUpdateNstrumenta } =
  //   React.useContext(NstrumentaContext) ?? {};

  // Filter all of our topics to find the ones with a CompresssedImage message.
  const imageTopics = (topics ?? []).filter((topic) =>
    ["ACCEL_RAW", "GPS_RAW", "MAXWELL", "START"].includes(topic.name),
  );

  const { selectSource } = usePlayerSelection();

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
    if (nstrumentaData?.data.mp4) {
      const video = videoRef.current;
      if (video) {
        const blobUrl = URL.createObjectURL(nstrumentaData.data.mp4);
        video.src = blobUrl;
      }
    }
  }, [nstrumentaData.data.mp4]);

  useEffect(() => {
    if (nstrumentaData?.data.mcap) {
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
      // Subscribe to the new image topic when a new topic is chosen.
      context.subscribe([state.topic]);
    }
  }, [context, state.topic]);

  // Choose our first available image topic as a default once we have a list of topics available.
  useEffect(() => {
    if (state.topic == undefined) {
      setState({ topic: imageTopics[0]?.name });
    }
  }, [state.topic, imageTopics]);

  // Every time we get a new image message draw it to the canvas.
  useEffect(() => {
    if (message) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      drawImageOnCanvas(message.message.data, canvasRef.current!, message.message.format).catch(
        // eslint-disable-next-line no-restricted-syntax
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
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      source.setAttribute("src", (window.URL || window.webkitURL).createObjectURL(blob));
      videoRef.current.appendChild(source);
      videoRef.current.addEventListener("loadedmetadata", () => {
        setVideoDimensions({
          width: videoRef.current?.videoWidth ?? 320,
          height: videoRef.current?.videoHeight ?? 200,
        });
        // videoRef.current?.play();
      });
      videoRef.current.load();
    };
    reader.readAsArrayBuffer(file as File);
  }, []);

  function handleSlider() {
    // // move to video component
    // if (videoRef.current) {
    //   videoRef.current.currentTime = Number(event.target.value);
    // }
    // setCurrentTime(Number(event.target.value));
  }

  const handleUpdateNstrumenta = React.useCallback(async () => {
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
          blob = await nstrumentaClient.storage?.download(path);
          data.json = await new Response(blob).json();
          break;
        case "mcap":
          data.mcap = await nstrumentaClient.storage?.download(path);
          break;
        case "mp4":
          data.mp4 = await nstrumentaClient.storage?.download(path);
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

  useEffect(() => {
    setNstrumentaData((prev) => ({
      ...prev,
      handleUpdateNstrumenta,
    }));
  }, [handleUpdateNstrumenta]);

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const start = allFrames[0] ? allFrames[0].receiveTime : { sec: 0, nsec: 0 };
  const end = allFrames[allFrames.length - 1]
    ? // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      allFrames[allFrames.length - 1]!.receiveTime
    : { sec: 0, nsec: 0 };
  const currentTimestamp = currentTime.sec * 1000 + currentTime.nsec / 1000000;
  // duration = end?.sec * 1000 + end?.nsec / 1000000 - (start?.sec * 1000 + start?.nsec / 1000000);
  const currentOffset = currentTimestamp - (start.sec * 1000 + start.nsec / 1000000);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = currentOffset / 1000;
    }
  }, [currentOffset]);

  return (
    <div className={cx(classes.root)}>
      <video
        ref={videoRef}
        width={videoDimensions.width}
        height={videoDimensions.height}
        autoPlay={false}
      />
      <div className="card">
        <input
          type="range"
          min={start.sec * 1000 + start.nsec / 1000000}
          max={end.sec * 1000 + end.nsec / 1000000}
          value={currentTimestamp}
          onChange={handleSlider}
          className="slider"
          id="myRange"
        />
        <label htmlFor="myRange">
          Current Time:
          {currentTimestamp}
        </label>
      </div>
      <p className="read-the-docs">
        <button type="button" onClick={handleClick} name="upload">
          get video
        </button>
        <input
          type="file"
          aria-label="add files"
          ref={inputRef}
          multiple={false}
          onChange={handleChange}
          style={{ display: "none" }}
        />
      </p>
      <p>
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
      </p>
      <div className="copyright">Copyright © 2022 PNI Sensor</div>
      <div className={cx(classes.debug)}>
        <div>current offset: {Math.floor(currentOffset)}</div>
        <div>allFrame length: {allFrames.length}</div>
        <div>currentTimestamp: {currentTimestamp}</div>
        <div>currentOffset: {currentOffset}</div>
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
      </div>
    </div>
  );
};

class CustomErrorBoundary extends React.Component {
  public override state: { hasError: boolean };

  public constructor(props: Record<string, unknown>) {
    if (props == undefined) {
      console.error("props is undefined");
    }
    super(props);
    this.state = { hasError: false };
  }

  public static getDerivedStateFromError() {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  public override componentDidCatch(error: unknown, errorInfo: unknown) {
    // You can also log the error to an error reporting service
    // eslint-disable-next-line no-restricted-syntax
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
