// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import CheckIcon from "@mui/icons-material/Check";
import {
  Button,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  styled as muiStyled,
} from "@mui/material";
import { useCallback, useEffect, useState } from "react";

import { useMessagePipeline } from "@foxglove/studio-base/components/MessagePipeline";
import {
  LayoutState,
  useCurrentLayoutActions,
  useCurrentLayoutSelector,
} from "@foxglove/studio-base/context/CurrentLayoutContext";

const RATE_OPTIONS = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 0.8, 1, 2, 3, 5];

const formatRate = (val: number) => `${val < 0.1 ? val.toFixed(2) : val}×`;

const configRateSelector = (state: LayoutState) =>
  state.selectedLayout?.data?.playbackConfig.playbackRate;

const StyledButton = muiStyled(Button)(({ theme }) => ({
  padding: theme.spacing(0.625, 0.5),
  backgroundColor: "transparent",

  ":hover": {
    backgroundColor: theme.palette.action.hover,
  },
}));

export default function PlaybackRateControls(): JSX.Element {
  const [anchorEl, setAnchorEl] = useState<undefined | HTMLElement>(undefined);
  const open = Boolean(anchorEl);
  const configRate = useCurrentLayoutSelector(configRateSelector);
  const playbackRate = useMessagePipeline(
    useCallback(({ playerState }) => playerState.activeData?.playbackRate, []),
  );
  const setPlaybackRate = useMessagePipeline(useCallback((state) => state.setPlaybackRate, []));
  const { setPlaybackConfig } = useCurrentLayoutActions();
  const setRate = useCallback(
    (newRate: number) => {
      setPlaybackConfig({ playbackRate: newRate });
      setPlaybackRate?.(newRate);
    },
    [setPlaybackConfig, setPlaybackRate],
  );

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(undefined);
  };

  // Set the playback rate to the rate that we got from the config whenever we get a new Player.
  useEffect(() => {
    if (configRate != undefined) {
      setPlaybackRate?.(configRate);
    }
  }, [configRate, setPlaybackRate]);

  const displayedRate = playbackRate ?? configRate;

  return (
    <>
      <StyledButton
        id="playback-rate-button"
        aria-controls={open ? "playback-rate-menu" : undefined}
        aria-haspopup="true"
        aria-expanded={open ? "true" : undefined}
        onClick={handleClick}
        data-testid="PlaybackRateControls-Dropdown"
        disabled={setPlaybackRate == undefined}
        disableRipple
        variant="contained"
        color="inherit"
        endIcon={<ArrowDropDownIcon />}
      >
        {displayedRate == undefined ? "–" : formatRate(displayedRate)}
      </StyledButton>
      <Menu
        id="playback-rate-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          "aria-labelledby": "playback-rate-button",
        }}
        anchorOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
      >
        {RATE_OPTIONS.map((option) => (
          <MenuItem
            selected={displayedRate === option}
            key={option}
            onClick={() => {
              setRate(option);
              handleClose();
            }}
          >
            {displayedRate === option && (
              <ListItemIcon>
                <CheckIcon fontSize="small" />
              </ListItemIcon>
            )}
            <ListItemText
              inset={displayedRate !== option}
              primary={formatRate(option)}
              primaryTypographyProps={{ variant: "body2" }}
            />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
