// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { useMemo } from "react";

import LayoutManagerContext from "@foxglove/studio-base/context/LayoutManagerContext";
import { useCurrentUser, useNstrumentaContext } from "@foxglove/studio-base/context/NstrumentaContext";
import { ILayoutStorage, LayoutID } from "@foxglove/studio-base/services/ILayoutStorage";
import LayoutManager from "@foxglove/studio-base/services/LayoutManager/LayoutManager";


import { Layout } from "@foxglove/studio-base";

import { collection, deleteDoc, doc, getDoc, getDocs, getFirestore, setDoc } from "firebase/firestore";


export default function LayoutManagerProvider({
  children,
}: React.PropsWithChildren<unknown>): JSX.Element {



  const { firebaseInstance, projectId } = useNstrumentaContext();
  const { currentUser } = useCurrentUser();

  console.log(currentUser);
  console.log(firebaseInstance);


  const nstrumentaLayoutStorage = useMemo<ILayoutStorage>(
    () => {
      const fb = firebaseInstance;


      if (!fb) {
        class MockLayoutStorage implements ILayoutStorage {
          async list(): Promise<readonly Layout[]> {
            console.log("layout syncing not connected.");
            return await [];
          }
          async get(id: LayoutID): Promise<Layout | undefined> {
            console.log("layout syncing not connected.", id);
            return await undefined
          }
          async put(layout: Layout): Promise<Layout> {
            console.log("layout syncing not connected.", layout);
            return await layout
          }
          async delete(id: LayoutID): Promise<void> {
            console.log("layout syncing not connected.", id);
          }

        }
        return new MockLayoutStorage;

      }
      const db = getFirestore(fb.app);
      const layoutsCollection = `projects/${projectId}/layouts`

      class NstLayoutStorage implements ILayoutStorage {
        layouts?: Layout[] = [];


        public async list(): Promise<readonly Layout[]> {

          const results: Layout[] = []
          const querySnapshot = await getDocs(collection(db, layoutsCollection));
          querySnapshot.forEach((doc) => {
            const data = doc.data() as Layout;
            results.push(data)
          });

          return results;
        }


        public async get(id: LayoutID): Promise<Layout | undefined> {
          return (await getDoc(doc(db, layoutsCollection, id))).data() as Layout;
        }

        public async put(layout: Layout): Promise<Layout> {
          const layoutWithoutUndefinedFields = JSON.parse(JSON.stringify(layout)!)
          await setDoc(doc(db, layoutsCollection, layout.id), layoutWithoutUndefinedFields);
          return layout;
        }

        public async delete(id: LayoutID): Promise<void> {
          return await deleteDoc(doc(db, layoutsCollection, id))
        }

      }
      return new NstLayoutStorage()

    }, [firebaseInstance, projectId]
  )

  if (nstrumentaLayoutStorage) {

    const layoutManager = useMemo(
      () => new LayoutManager({ local: nstrumentaLayoutStorage, remote: undefined }),
      [nstrumentaLayoutStorage],
    );



    return (
      <LayoutManagerContext.Provider value={layoutManager}>
        {children}
      </LayoutManagerContext.Provider>
    );
  }
  else {
    return <>{children}</>
  }
}
