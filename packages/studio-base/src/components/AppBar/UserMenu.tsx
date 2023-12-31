// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { Divider, Menu, MenuItem, PopoverPosition, PopoverReference } from "@mui/material";
import { makeStyles } from "tss-react/mui";

import {
  useCurrentUser,
} from "@foxglove/studio-base/context/CurrentUserContext";

const useStyles = makeStyles()({
  menuList: {
    minWidth: 200,
  },
});

type UserMenuProps = {
  handleClose: () => void;
  anchorEl?: HTMLElement;
  anchorReference?: PopoverReference;
  anchorPosition?: PopoverPosition;
  disablePortal?: boolean;
  open: boolean;
};

export function UserMenu({
  anchorEl,
  anchorReference,
  anchorPosition,
  disablePortal,
  handleClose,
  open,
}: UserMenuProps): JSX.Element {
  const { classes } = useStyles();
  const { currentUser, signIn, signOut } = useCurrentUser();

  return (
    <>
      <Menu
        anchorEl={anchorEl}
        anchorReference={anchorReference}
        anchorPosition={anchorPosition}
        disablePortal={disablePortal}
        id="account-menu"
        open={open}
        onClose={handleClose}
        onClick={handleClose}
        MenuListProps={{ className: classes.menuList, dense: true }}
      >
        {currentUser && <MenuItem disabled>{currentUser.email}</MenuItem>}
        <Divider variant="middle" />
        {currentUser ? (
          <MenuItem onClick={signOut}>Sign out</MenuItem>
        ) : (
          <MenuItem onClick={signIn}>Sign in</MenuItem>
        )}
      </Menu>
    </>
  );
}
