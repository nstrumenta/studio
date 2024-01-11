// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { useNstrumentaContext } from "@foxglove/studio-base/context/NstrumentaContext";
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
import { useState } from "react";


const StyledButton = muiStyled(Button)(({ theme }) => ({
    padding: theme.spacing(0.625, 0.5),
    backgroundColor: "transparent",

    ":hover": {
        backgroundColor: theme.palette.action.hover,
    },
}));

export default function NstrumentaProjectSelect(): JSX.Element {
    const [anchorEl, setAnchorEl] = useState<undefined | HTMLElement>(undefined);
    const open = Boolean(anchorEl);

    const { userProjects, projectId, setProjectId } = useNstrumentaContext();

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(undefined);
    };


    return (
        <>
            <StyledButton
                id="user-project-button"
                aria-controls={open ? "user-project-menu" : undefined}
                aria-haspopup="true"
                aria-expanded={open ? "true" : undefined}
                onClick={handleClick}
                data-testid="PlaybackSpeedControls-Dropdown"
                disabled={setProjectId == undefined}
                disableRipple
                variant="contained"
                color="inherit"
                endIcon={<ArrowDropDownIcon />}
            >
                {projectId ?? "No project selected"}
            </StyledButton>
            <Menu
                id="user-project-menu"
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                MenuListProps={{
                    "aria-labelledby": "user-project-button",
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
                {userProjects?.map((option) => (
                    <MenuItem
                        selected={projectId === option}
                        key={option}
                        onClick={() => {
                            setProjectId && setProjectId(option);
                            handleClose();
                        }}
                    >
                        {projectId === option && (
                            <ListItemIcon>
                                <CheckIcon fontSize="small" />
                            </ListItemIcon>
                        )}
                        <ListItemText
                            inset={projectId !== option}
                            primary={option}
                            primaryTypographyProps={{ variant: "body2" }}
                        />
                    </MenuItem>
                ))}
            </Menu>
        </>
    );
}
