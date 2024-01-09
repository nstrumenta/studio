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

import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import {
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  TextField,
  Typography
} from "@mui/material";
import fuzzySort from "fuzzysort";
import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { makeStyles } from "tss-react/mui";

import Stack from "@foxglove/studio-base/components/Stack";
import TextHighlight from "@foxglove/studio-base/components/TextHighlight";
import { useNstrumentaContext } from "@foxglove/studio-base/context/NstrumentaContext";
import { PanelInfo } from "@foxglove/studio-base/context/PanelCatalogContext";
import { ExtensionNamespace } from "@foxglove/studio-base/types/Extensions";
import {
  PanelConfig,
  SavedProps
} from "@foxglove/studio-base/types/panels";
import { collection, getDocs, getFirestore } from 'firebase/firestore';


const useStyles = makeStyles<void>()((theme, _params) => {
  return {
    fullHeight: {
      height: "100%",
    },
    imagePlaceholder: {
      paddingBottom: `${(200 / 280) * 100}%`,
      backgroundColor: theme.palette.background.default,
    },
    cardContent: {
      flex: "auto",
    },
    listItemButton: {
    },
    toolbar: {
      position: "sticky",
      top: -0.5, // yep that's a half pixel to avoid a gap between the appbar and panel top
      zIndex: 100,
      display: "flex",
      padding: theme.spacing(1.5),
      justifyContent: "stretch",
      backgroundImage: `linear-gradient(to top, transparent, ${theme.palette.background.menu
        } ${theme.spacing(1.5)}) !important`,
    },
  };
});


type PanelItemProps = {
  panel: {
    type: string;
    title: string;
    description?: string;
    config?: PanelConfig;
    relatedConfigs?: SavedProps;
    thumbnail?: string;
    extensionNamespace?: ExtensionNamespace;
  };
  searchQuery: string;
  checked?: boolean;
  highlighted?: boolean;
  onClick: () => void;
};

function blurActiveElement() {
  // Clear focus from the panel menu button so that spacebar doesn't trigger
  // more panel additions.
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
}

function ExperimentListItem({
  searchQuery,
  panel,
  onClick,
  checked = false,
  highlighted = false,
}: PanelItemProps) {
  const { classes } = useStyles();
  const scrollRef = useRef<HTMLElement>(ReactNull);

  useEffect(() => {
    if (highlighted && scrollRef.current) {
      const highlightedItem = scrollRef.current.getBoundingClientRect();
      const scrollContainer = scrollRef.current.parentElement?.parentElement?.parentElement;
      if (scrollContainer) {
        const scrollContainerToTop = scrollContainer.getBoundingClientRect().top;

        const isInView =
          highlightedItem.top >= 0 &&
          highlightedItem.top >= scrollContainerToTop &&
          highlightedItem.top + 50 <= window.innerHeight;

        if (!isInView) {
          scrollRef.current.scrollIntoView();
        }
      }
    }
  }, [highlighted]);

  const targetString = panel.extensionNamespace
    ? `${panel.title} [${panel.extensionNamespace}]`
    : panel.title;

  const onClickWithStopPropagation = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      onClick();
    },
    [onClick],
  );


  return (
    <ListItem disableGutters disablePadding>
      <ListItemButton
        selected={highlighted}
        className={classes.listItemButton}
        disabled={checked}
        onClick={onClickWithStopPropagation}
      >
        <ListItemText
          primary={
            <span data-testid={`panel-menu-item ${panel.title}`}>
              <TextHighlight targetStr={targetString} searchText={searchQuery} />
            </span>
          }
          primaryTypographyProps={{ fontWeight: checked ? "bold" : undefined }}
        />
      </ListItemButton>
    </ListItem>
  );
}

export type PanelSelection = {
  type: string;
  config?: PanelConfig;
  relatedConfigs?: {
    [panelId: string]: PanelConfig;
  };
};

type Props = {
  onPanelSelect: (arg0: PanelSelection) => void;
};

const ExperimentList = forwardRef<HTMLDivElement, Props>((props: Props, ref) => {
  const { onPanelSelect } = props;
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedPanelIdx, setHighlightedPanelIdx] = useState<number | undefined>();
  const { classes, cx } = useStyles();


  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const query = event.target.value;
    setSearchQuery(query);

    // When there is a search query, automatically highlight the first (0th) item.
    // When the user erases the query, remove the highlight.
    setHighlightedPanelIdx(query ? 0 : undefined);
  }, []);

  const { firebaseInstance } = useNstrumentaContext();

  const [panels, setPanels] = useState<PanelInfo[]>([]);

  useEffect(() => {
    if (!firebaseInstance?.app) return;
    const db = getFirestore(firebaseInstance.app);
    const fetchData = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'projects/peek-ai-2023/data'));
        const panels: PanelInfo[] = []
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          console.log(doc.id, ' => ', data);
          panels.push({
            title: data.name,
            type: doc.id,
            module: async () => await import("../../panels/Image")
          })
        });
        setPanels(panels)
      } catch (error) {
        console.log('Error getting documents: ', error);
      }
    };
    fetchData()
  }, [firebaseInstance]);

  const getFilteredPanels = useCallback(
    (panels: PanelInfo[]) => {
      return searchQuery.length > 0
        ? fuzzySort
          .go(searchQuery, panels, {
            keys: ["title", "description"],
            // Weigh title matches more heavily than description matches.
            scoreFn: (a) => Math.max(a[0] ? a[0].score : -1000, a[1] ? a[1].score - 100 : -1000),
            threshold: -900,
          })
          .map((searchResult) => searchResult.obj)
        : panels;
    },
    [searchQuery],
  );

  const allFilteredPanels = useMemo(
    () => getFilteredPanels(panels),
    [panels, getFilteredPanels],
  );

  const highlightedPanel = useMemo(() => {
    return highlightedPanelIdx != undefined ? allFilteredPanels[highlightedPanelIdx] : undefined;
  }, [allFilteredPanels, highlightedPanelIdx]);

  const noResults = allFilteredPanels.length === 0;

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Prevent key down events from triggering the parent menu, if any.
      if (e.key !== "Escape") {
        e.stopPropagation();
      }
      if (e.key === "ArrowDown") {
        setHighlightedPanelIdx((existing) => {
          if (existing == undefined) {
            return 0;
          }
          return (existing + 1) % allFilteredPanels.length;
        });
      } else if (e.key === "ArrowUp") {
        setHighlightedPanelIdx((existing) => {
          // nothing to highlight if there are no entries
          if (allFilteredPanels.length <= 0) {
            return undefined;
          }

          if (existing == undefined) {
            return allFilteredPanels.length - 1;
          }
          return (existing - 1 + allFilteredPanels.length) % allFilteredPanels.length;
        });
      } else if (e.key === "Enter" && highlightedPanel) {
        onPanelSelect({
          type: highlightedPanel.type,
          config: highlightedPanel.config,
          relatedConfigs: highlightedPanel.relatedConfigs,
        });
      }
    },
    [allFilteredPanels.length, highlightedPanel, onPanelSelect],
  );

  const displayPanelListItem = useCallback(
    (panelInfo: PanelInfo) => {
      const { title, type, config, relatedConfigs } = panelInfo;
      return (
        <ExperimentListItem
          key={`${type}-${title}`}
          panel={panelInfo}
          onClick={() => {
            onPanelSelect({ type, config, relatedConfigs });
            blurActiveElement();
          }}
          highlighted={highlightedPanel?.title === title}
          searchQuery={searchQuery}
        />
      );
    },
    [
      highlightedPanel?.title,
      onPanelSelect,
      searchQuery,
    ],
  );

  return (
    <div className={classes.fullHeight} ref={ref}>
      <div
        className={cx(classes.toolbar)}
      >
        <TextField
          fullWidth
          placeholder={'search experiments'}
          value={searchQuery}
          onChange={handleSearchChange}
          onKeyDown={onKeyDown}
          onBlur={() => setHighlightedPanelIdx(undefined)}
          autoFocus
          InputProps={{
            startAdornment: <SearchIcon fontSize="small" color="primary" />,
            endAdornment: searchQuery && (
              <IconButton size="small" edge="end" onClick={() => setSearchQuery("")}>
                <CloseIcon fontSize="small" />
              </IconButton>
            ),
          }}
        />
      </div>

      <List dense disablePadding>
        {allFilteredPanels.map(displayPanelListItem)}
      </List>

      {noResults && (
        <Stack alignItems="center" justifyContent="center" paddingX={1} paddingY={2}>
          <Typography variant="body2" color="text.secondary">
            {"No matches"}
          </Typography>
        </Stack>
      )}
    </div>
  );
});
ExperimentList.displayName = "Panel List";

export default ExperimentList;
