// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/
//
// This file incorporates work covered by the following copyright and
// permission notice:
//
//   Copyright 2018-2021 Cruise LLC
//
//   This source code is licensed under the Apache License, Version 2.0,
//   found at http://www.apache.org/licenses/LICENSE-2.0
//   You may not use this file except in compliance with the License.

import { useSnackbar } from "notistack";
import { PropsWithChildren, useCallback, useLayoutEffect, useMemo, useState } from "react";
import { useLatest, useMountedState } from "react-use";

import { useShallowMemo } from "@foxglove/hooks";
import Logger from "@foxglove/log";
import { MessagePipelineProvider } from "@foxglove/studio-base/components/MessagePipeline";
import { useAnalytics } from "@foxglove/studio-base/context/AnalyticsContext";
import {
  LayoutState,
  useCurrentLayoutActions,
  useCurrentLayoutSelector,
} from "@foxglove/studio-base/context/CurrentLayoutContext";
import { useLayoutManager } from "@foxglove/studio-base/context/LayoutManagerContext";
import { useNativeWindow } from "@foxglove/studio-base/context/NativeWindowContext";
import PlayerSelectionContext, {
  DataSourceArgs,
  IDataSourceFactory,
  PlayerSelection,
} from "@foxglove/studio-base/context/PlayerSelectionContext";
import { useUserNodeState } from "@foxglove/studio-base/context/UserNodeStateContext";
import { GlobalVariables } from "@foxglove/studio-base/hooks/useGlobalVariables";
import useIndexedDbRecents, { RecentRecord } from "@foxglove/studio-base/hooks/useIndexedDbRecents";
import useWarnImmediateReRender from "@foxglove/studio-base/hooks/useWarnImmediateReRender";
import AnalyticsMetricsCollector from "@foxglove/studio-base/players/AnalyticsMetricsCollector";
import UserNodePlayer from "@foxglove/studio-base/players/UserNodePlayer";
import { Player } from "@foxglove/studio-base/players/types";
import { UserNodes } from "@foxglove/studio-base/types/panels";
import { useNstrumentaContext } from "@foxglove/studio-base/context/NstrumentaContext";
import { getDownloadURL, ref } from "firebase/storage";
import { IterablePlayer, WorkerIterableSource } from "@foxglove/studio-base/players/IterablePlayer";

const log = Logger.getLogger(__filename);

const EMPTY_USER_NODES: UserNodes = Object.freeze({});
const EMPTY_GLOBAL_VARIABLES: GlobalVariables = Object.freeze({});

type PlayerManagerProps = {
  playerSources: IDataSourceFactory[];
};

const userNodesSelector = (state: LayoutState) =>
  state.selectedLayout?.data?.userNodes ?? EMPTY_USER_NODES;
const globalVariablesSelector = (state: LayoutState) =>
  state.selectedLayout?.data?.globalVariables ?? EMPTY_GLOBAL_VARIABLES;

export default function PlayerManager(props: PropsWithChildren<PlayerManagerProps>): JSX.Element {
  const { children, playerSources } = props;

  useWarnImmediateReRender();

  const { setUserNodeDiagnostics, addUserNodeLogs, setUserNodeRosLib, setUserNodeTypesLib } =
    useUserNodeState();
  const userNodeActions = useShallowMemo({
    setUserNodeDiagnostics,
    addUserNodeLogs,
    setUserNodeRosLib,
    setUserNodeTypesLib,
  });

  const nativeWindow = useNativeWindow();

  const isMounted = useMountedState();

  const analytics = useAnalytics();
  const metricsCollector = useMemo(() => new AnalyticsMetricsCollector(analytics), [analytics]);

  const layoutStorage = useLayoutManager();
  const { setSelectedLayoutId } = useCurrentLayoutActions();

  const [basePlayer, setBasePlayer] = useState<Player | undefined>();

  const userNodes = useCurrentLayoutSelector(userNodesSelector);
  const globalVariables = useCurrentLayoutSelector(globalVariablesSelector);

  const { recents, addRecent } = useIndexedDbRecents();

  // We don't want to recreate the player when the these variables change, but we do want to
  // initialize it with the right order, so make a variable for its initial value we can use in the
  // dependency array to the player useMemo.
  //
  // Updating the player with new values in handled by effects below the player useMemo or within
  // the message pipeline
  const globalVariablesRef = useLatest(globalVariables);

  const player = useMemo(() => {
    if (!basePlayer) {
      return undefined;
    }

    const userNodePlayer = new UserNodePlayer(basePlayer, userNodeActions);
    userNodePlayer.setGlobalVariables(globalVariablesRef.current);
    return userNodePlayer;
  }, [basePlayer, globalVariablesRef, userNodeActions]);

  useLayoutEffect(() => void player?.setUserNodes(userNodes), [player, userNodes]);

  const { enqueueSnackbar } = useSnackbar();

  const selectSource = useCallback(
    async (sourceId: string) => {
      log.debug(`Select Source: ${sourceId}`);

      const foundSource = playerSources.find(
        (source) => source.id === sourceId || source.legacyIds?.includes(sourceId),
      );
      if (!foundSource) {
        enqueueSnackbar(`Unknown data source: ${sourceId}`, { variant: "warning" });
        return;
      }

      metricsCollector.setProperty("player", sourceId);


      // const newPlayer = await foundSource.initialize({
      //   metricsCollector,
      // });

      const makeNewPlayer = async () => {
        const { firebaseInstance } = useNstrumentaContext();

        if (firebaseInstance?.storage == undefined) {
          console.error("firebase not initialized");
          return;
        }
        const dataFilePath = "projects/peek-ai-2023/data/recording-f1bf24c7-100d-42a5-84d1-3aa8c9a104ce.mcap"; // TODO picker for this

        let dataUrl: string = "";
        if (dataFilePath != undefined) {
          dataUrl = await getDownloadURL(ref(firebaseInstance.storage, dataFilePath));
        }

        const source = new WorkerIterableSource({
          initWorker: () => {
            return new Worker(
              // foxglove-depcheck-used: babel-plugin-transform-import-meta
              new URL(
                "@foxglove/studio-base/players/IterablePlayer/Mcap/McapIterableSourceWorker.worker",
                import.meta.url,
              ),
            );
          },
          initArgs: { url: dataUrl },
        });

        return new IterablePlayer({
          source,
          isSampleDataSource: true,
          name: "nstrumenta",
          metricsCollector,
          // Use blank url params so the data source is set in the url
          urlParams: {},
          sourceId,
        });
      }

      const newPlayer = await makeNewPlayer();

      setBasePlayer(newPlayer);

      if (foundSource.sampleLayout) {
        try {
          const layouts = await layoutStorage.getLayouts();
          let sourceLayout = layouts.find((layout) => layout.name === foundSource.displayName);
          if (sourceLayout == undefined) {
            sourceLayout = await layoutStorage.saveNewLayout({
              name: foundSource.displayName,
              data: foundSource.sampleLayout,
              permission: "CREATOR_WRITE",
            });
          }

          if (isMounted()) {
            setSelectedLayoutId(sourceLayout.id);
          }
        } catch (err) {
          enqueueSnackbar((err as Error).message, { variant: "error" });
        }
      }
    },
    [
      playerSources,
      metricsCollector,
      enqueueSnackbar,
      layoutStorage,
      isMounted,
      setSelectedLayoutId,
      addRecent,
      nativeWindow,
    ],
  );

  // Select a recent entry by id
  // necessary to pull out callback creation to avoid capturing the initial player in closure context
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const selectRecent = useCallback(
    createSelectRecentCallback(recents, selectSource, enqueueSnackbar),
    [recents, enqueueSnackbar, selectSource],
  );

  // Make a RecentSources array for the PlayerSelectionContext
  const recentSources = useMemo(() => {
    return recents.map((item) => {
      return { id: item.id, title: item.title, label: item.label };
    });
  }, [recents]);

  const value: PlayerSelection = {
    selectSource,
    selectRecent,
    availableSources: playerSources,
    recentSources,
  };

  return (
    <>
      <PlayerSelectionContext.Provider value={value}>
        <MessagePipelineProvider player={player} globalVariables={globalVariablesRef.current}>
          {children}
        </MessagePipelineProvider>
      </PlayerSelectionContext.Provider>
    </>
  );
}

/**
 * This was moved out of the PlayerManager function due to a memory leak occurring in memoized state of Start.tsx
 * that was retaining old player instances. Having this callback be defined within the PlayerManager makes it store the
 * player at instantiation within the closure context. That callback is then stored in the memoized state with its closure context.
 * The callback is updated when the player changes but part of the `Start.tsx` holds onto the formerly memoized state for an
 * unknown reason.
 * To make this function safe from storing old closure contexts in old memoized state in components where it
 * is used, it has been moved out of the PlayerManager function.
 */
function createSelectRecentCallback(
  recents: RecentRecord[],
  selectSource: (sourceId: string, dataSourceArgs: DataSourceArgs) => Promise<void>,
  enqueueSnackbar: ReturnType<typeof useSnackbar>["enqueueSnackbar"],
) {
  return (recentId: string) => {
    // find the recent from the list and initialize
    const foundRecent = recents.find((value) => value.id === recentId);
    if (!foundRecent) {
      enqueueSnackbar(`Failed to restore recent: ${recentId}`, { variant: "error" });
      return;
    }

    switch (foundRecent.type) {
      case "connection": {
        void selectSource(foundRecent.sourceId, {
          type: "connection",
          params: foundRecent.extra,
        });
        break;
      }
      case "file": {
        void selectSource(foundRecent.sourceId, {
          type: "file",
          handle: foundRecent.handle,
        });
      }
    }
  };
}
