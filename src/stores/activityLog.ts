/**
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { atom, getDefaultStore } from 'jotai';

export type ActivityLogEntry = {
  id: string;
  timestamp: number;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
};

const MAX_ENTRIES = 100;

export const activityLogAtom = atom<ActivityLogEntry[]>([]);
export const unreadErrorCountAtom = atom<number>(0);

export const addLogEntry = (type: ActivityLogEntry['type'], message: string) => {
  const store = getDefaultStore();
  const entry: ActivityLogEntry = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    type,
    message,
  };
  store.set(activityLogAtom, (prev) => [entry, ...prev].slice(0, MAX_ENTRIES));
  if (type === 'error') {
    store.set(unreadErrorCountAtom, (prev) => prev + 1);
  }
};

export const clearUnreadErrors = () => {
  getDefaultStore().set(unreadErrorCountAtom, 0);
};

export const clearActivityLog = () => {
  const store = getDefaultStore();
  store.set(activityLogAtom, []);
  store.set(unreadErrorCountAtom, 0);
};
