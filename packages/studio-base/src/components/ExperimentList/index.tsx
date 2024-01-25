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


type ExperimentItemProps = {
  experiment: ExperimentInfo;
  searchQuery: string;
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
  experiment,
  onClick,
  highlighted = false,
}: ExperimentItemProps) {
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

  const targetString = experiment.title;

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
        onClick={onClickWithStopPropagation}
      >
        <ListItemText
          primary={
            <span data-testid={`panel-menu-item ${experiment.id}`}>
              <TextHighlight targetStr={targetString} searchText={searchQuery} />
            </span>
          }
        />
      </ListItemButton>
    </ListItem>
  );
}

type ExperimentInfo = { title: string, id: string, filePath: string, lastModified: number }

type Props = {
  onSelect: (filePath: string) => void;
};

const ExperimentList = forwardRef<HTMLDivElement, Props>((props: Props, ref) => {
  const { onSelect } = props;
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

  const { firebaseInstance, projectId } = useNstrumentaContext();

  const [experiments, setExperiments] = useState<ExperimentInfo[]>([]);

  useEffect(() => {
    if (!firebaseInstance?.app) return;
    const db = getFirestore(firebaseInstance.app);
    const fetchData = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, `projects/${projectId}/data`));
        const experiments: ExperimentInfo[] = []
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          experiments.push({
            title: data.name,
            id: doc.id,
            filePath: data.filePath,
            lastModified: data.lastModified
          })
        });
        setExperiments(experiments.sort((a, b) => b.lastModified - a.lastModified))
      } catch (error) {
        console.log('Error getting documents: ', error);
      }
    };
    fetchData()
  }, [firebaseInstance, projectId]);

  const getFilteredExperiments = useCallback(
    (experiments: ExperimentInfo[]) => {
      return searchQuery.length > 0
        ? fuzzySort
          .go(searchQuery, experiments, {
            keys: ["title", "description"]
          })
          .map((searchResult) => searchResult.obj)
        : experiments;
    },
    [searchQuery],
  );

  const allFilteredExperiments = useMemo(
    () => getFilteredExperiments(experiments),
    [experiments, getFilteredExperiments],
  );

  const highlightedPanel = useMemo(() => {
    return highlightedPanelIdx != undefined ? allFilteredExperiments[highlightedPanelIdx] : undefined;
  }, [allFilteredExperiments, highlightedPanelIdx]);

  const noResults = allFilteredExperiments.length === 0;

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
          return (existing + 1) % allFilteredExperiments.length;
        });
      } else if (e.key === "ArrowUp") {
        setHighlightedPanelIdx((existing) => {
          // nothing to highlight if there are no entries
          if (allFilteredExperiments.length <= 0) {
            return undefined;
          }

          if (existing == undefined) {
            return allFilteredExperiments.length - 1;
          }
          return (existing - 1 + allFilteredExperiments.length) % allFilteredExperiments.length;
        });
      } else if (e.key === "Enter" && highlightedPanel) {
        onSelect(highlightedPanel.filePath);
      }
    },
    [allFilteredExperiments.length, highlightedPanel, onSelect],
  );

  const displayPanelListItem = useCallback(
    (experiment: ExperimentInfo) => {
      const { title, filePath, id } = experiment;
      return (
        <ExperimentListItem
          key={`${title}-${id}`}
          experiment={experiment}
          onClick={() => {
            onSelect(filePath);
            blurActiveElement();
          }}
          highlighted={highlightedPanel?.title === title}
          searchQuery={searchQuery}
        />
      );
    },
    [
      highlightedPanel?.title,
      onSelect,
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
        {allFilteredExperiments.map(displayPanelListItem)}
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
