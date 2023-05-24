// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { ReactNode, useContext, useEffect } from "react";

import { NstrumentaContext } from "@foxglove/studio-base/context/NstrumentaContext";

export default function NstrumentaProvider({ children }: { children?: ReactNode }): JSX.Element {
  const client = useContext(NstrumentaContext);

  const init = async () => {
    // nstrumenta connect could happen here
  };

  useEffect(() => {
    init();
  }, []);

  return <NstrumentaContext.Provider value={client}>{children}</NstrumentaContext.Provider>;
}
