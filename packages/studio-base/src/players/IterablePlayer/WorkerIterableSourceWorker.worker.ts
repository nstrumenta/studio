// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import * as Comlink from "comlink";

import {
  abortSignalTransferHandler,
  iterableTransferHandler,
} from "@foxglove/comlink-transfer-handlers";
import { compare } from "@foxglove/rostime";
import { MessageEvent, Time } from "@foxglove/studio";

import type {
  GetBackfillMessagesArgs,
  IIterableSource,
  IMessageCursor,
  Initalization,
  IterableSourceInitializeArgs,
  IteratorResult,
  MessageIteratorArgs,
} from "./IIterableSource";

type SourceFn = () => Promise<{
  initialize: (args: IterableSourceInitializeArgs) => IIterableSource;
}>;

const RegisteredSourceModuleLoaders: Record<string, SourceFn> = {
  mcap: async () => await import("./Mcap/McapIterableSource"),
  rosbag: async () => await import("./BagIterableSource"),
  rosdb3: async () => await import("./rosdb3/RosDb3IterableSource"),
  ulog: async () => await import("./ulog/UlogIterableSource"),
  foxgloveDataPlatform: async () =>
    await import("./foxglove-data-platform/DataPlatformIterableSource"),
};

export type WorkerIterableSourceWorkerArgs = {
  sourceType: string;
  initArgs: IterableSourceInitializeArgs;
};

export class WorkerIterableSourceWorker {
  private readonly _args: WorkerIterableSourceWorkerArgs;

  private _source?: IIterableSource;

  public constructor(args: WorkerIterableSourceWorkerArgs) {
    this._args = args;
  }

  public async initialize(): Promise<Initalization> {
    const loadRegisteredSourceModule = RegisteredSourceModuleLoaders[this._args.sourceType];
    if (!loadRegisteredSourceModule) {
      throw new Error(`No source for type: ${this._args.sourceType}`);
    }
    const module = await loadRegisteredSourceModule();
    this._source = module.initialize(this._args.initArgs);
    return await this._source.initialize();
  }

  public messageIterator(
    args: MessageIteratorArgs,
  ): AsyncIterableIterator<Readonly<IteratorResult>> {
    if (!this._source) {
      throw new Error("uninitialized");
    }
    return this._source.messageIterator(args);
  }

  public async getBackfillMessages(
    args: Omit<GetBackfillMessagesArgs, "abortSignal">,
    // abortSignal is a separate argument so it can be proxied by comlink since AbortSignal is not
    // clonable (and needs to signal across the worker boundary)
    abortSignal?: AbortSignal,
  ): Promise<MessageEvent<unknown>[]> {
    if (!this._source) {
      throw new Error("uninitialized");
    }
    return await this._source.getBackfillMessages({
      ...args,
      abortSignal,
    });
  }

  public getMessageCursor(args: {
    topics: string[];
    start: Time;
    end: Time;
  }): IMessageCursor & Comlink.ProxyMarked {
    const iter = this.messageIterator(args);

    // fixme - do I need to cleanup this proxy?
    return Comlink.proxy({
      async next() {
        // something fixme
        const result = await iter.next();
        return result.value;
      },
      async readUntil(end: Time) {
        const results: IteratorResult[] = [];

        for (;;) {
          const result = await iter.next();
          if (result.done === true) {
            break;
          }

          const value = result.value;
          if (value.msgEvent?.receiveTime && compare(value.msgEvent.receiveTime, end) > 0) {
            // fixme - store the last value for the next readuntil
            break;
          }
          results.push(value);
        }

        return results;
      },
    });
  }
}

Comlink.transferHandlers.set("iterable", iterableTransferHandler);
Comlink.transferHandlers.set("abortsignal", abortSignalTransferHandler);
Comlink.expose(WorkerIterableSourceWorker);
