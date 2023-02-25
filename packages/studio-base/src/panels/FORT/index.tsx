// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

/* eslint-disable @typescript-eslint/no-unnecessary-condition */
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import React, { StrictMode, useState, useEffect, useLayoutEffect } from "react";
import ReactDOM from "react-dom";

import { CompressedImage } from "@foxglove/schemas";
import type { PanelExtensionContext, RenderState, Time, Topic } from "@foxglove/studio";
import Panel from "@foxglove/studio-base/components/Panel";
import { PanelExtensionAdapter } from "@foxglove/studio-base/components/PanelExtensionAdapter";
import ThemeProvider from "@foxglove/studio-base/theme/ThemeProvider";
import type { SaveConfig } from "@foxglove/studio-base/types/panels";

import { App } from "./app";

// import { FORTPanel } from './app';

type ImageMessage = MessageEvent<CompressedImage>;

type PanelState = {
  topic?: string;
};

export const FORTPanel = ({ context }: { context: PanelExtensionContext }): JSX.Element => {
  // panel extensions must notify when they've completed rendering
  // onRender will setRenderDone to a done callback which we can invoke after we've rendered
  const [topics, setTopics] = useState<readonly Topic[] | undefined>();
  const [, setMessage] = useState<ImageMessage>();
  const [, setAllFrames] = useState<MessageEvent<unknown>[]>([]);
  const [, setCurrentTime] = useState<Time>({ sec: 0, nsec: 0 });
  const [renderDone, setRenderDone] = useState<(() => void) | undefined>();

  // Restore our state from the layout via the context.initialState property.
  const [state, setState] = useState<PanelState>(() => context.initialState as PanelState);

  // keyboard listeners for the 3d view to reset the camera
  useEffect(() => {
    //
  }, []);

  // Filter all of our topics to find the ones with a CompresssedImage message.
  const imageTopics = (topics ?? []).filter((topic) =>
    [
      "START_DOM",
      "START_VIDEO",
      "DEBUG",
      "DS_IN",
      "AR",
      "GPS",
      "TIMESTAMP_FULL",
      "DOM",
      "STOP_DOM",
    ].includes(topic.name),
  );

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
        // console.log("renderState.allFrames", renderState.allFrames.length);
        // const start = renderState.allFrames[0]
        //   ? renderState.allFrames[0].receiveTime
        //   : { sec: 0, nsec: 0 };
        // const end = renderState.allFrames[renderState.allFrames.length - 1]
        //   ? renderState.allFrames[renderState.allFrames.length - 1]!.receiveTime
        //   : { sec: 0, nsec: 0 };
        // setDuration(
        //   end?.sec * 1000 + end?.nsec / 1000000 - (start?.sec * 1000 + start?.nsec / 1000000)
        // );
        // console.log(renderState.allFrames.map((frame) => frame.topic));
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

  return (
    <div className="App">
      <App />
      <div className="copyright">Copyright © 2022 PNI Sensor</div>
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
          <FORTPanel context={context} />
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

const FORTPanelAdapter = (props: Props) => (
  <PanelExtensionAdapter
    config={props.config}
    saveConfig={props.saveConfig}
    initPanel={initPanel}
  />
);

FORTPanelAdapter.panelType = "FORT";
FORTPanelAdapter.defaultConfig = {};

export default Panel(FORTPanelAdapter);
