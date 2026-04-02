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
import type { MessageInstance } from 'antd/es/message/interface';

import { addLogEntry } from '@/stores/activityLog';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export type ShowNotificationOptions = {
  message: string;
  type: NotificationType;
  id?: string;
};

let messageApi: MessageInstance | null = null;

export const setupNotification = (msg: MessageInstance): void => {
  messageApi = msg;
};

const DURATION: Record<NotificationType, number> = {
  success: 3,
  info: 5,
  warning: 6,
  error: 8,
};

export const showNotification = ({
  message,
  type,
  id,
}: ShowNotificationOptions): void => {
  // Always log to activity log for persistence
  addLogEntry(type, message);

  if (!messageApi) {
    // eslint-disable-next-line no-console
    console.warn('[notification] setupNotification not called yet:', message);
    return;
  }

  messageApi.open({
    type,
    content: message,
    key: id,
    duration: DURATION[type],
  });
};
