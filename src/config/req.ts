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

import axios, { AxiosError, HttpStatusCode } from 'axios';
import { getDefaultStore } from 'jotai';
import { stringify } from 'qs';

import {
  API_HEADER_KEY,
  API_PREFIX,
  SKIP_INTERCEPTOR_HEADER,
} from '@/config/constant';
import { adminKeyAtom, isSettingsOpenAtom } from '@/stores/global';
import { showNotification } from '@/utils/notification';

export const req = axios.create();

req.interceptors.request.use((conf) => {
  conf.paramsSerializer = (p) => {
    if (p.filter) {
      p.filter = stringify(p.filter);
    }
    return stringify(p, {
      arrayFormat: 'repeat',
    });
  };
  conf.baseURL = API_PREFIX;
  const adminKey = getDefaultStore().get(adminKeyAtom);
  if (!adminKey) {
    getDefaultStore().set(isSettingsOpenAtom, true);
    return Promise.reject(new axios.Cancel('Admin Key not configured'));
  }
  conf.headers.set(API_HEADER_KEY, adminKey);
  return conf;
});

export type APISIXRespErr = {
  error_msg?: string;
  message?: string;
};

const notificationTimestamps = new Map<string, number>();

const showRateLimitedError = (
  id: string,
  message: string,
  intervalMs = 10_000
) => {
  const now = Date.now();
  const previous = notificationTimestamps.get(id) ?? 0;
  if (now - previous < intervalMs) return;
  notificationTimestamps.set(id, now);
  showNotification({ id, message, type: 'error' });
};

const matchSkipInterceptor = (err: AxiosError) => {
  const interceptors = err.config?.headers?.[SKIP_INTERCEPTOR_HEADER] || [];
  const status = err.response?.status;
  const failureType = status === undefined ? 'network' : String(status);
  return interceptors.some((value: string) => value === failureType);
};

/** Build a human-readable error message with request context. */
export function getRequestErrorMessage(
  err: AxiosError<APISIXRespErr>
): string {
  const method = err.config?.method?.toUpperCase() ?? '';
  const path = err.config?.url ?? '';
  const status = err.response?.status;
  const apisixMsg = err.response?.data?.error_msg || err.response?.data?.message;

  if (!err.response) {
    return `Network error: Cannot reach APISIX (${method} ${path}). Check that APISIX is running.`;
  }

  if (status === HttpStatusCode.ServiceUnavailable) {
    return apisixMsg
      ? `APISIX Admin API is reachable but its configuration store is unavailable: ${apisixMsg}`
      : 'APISIX Admin API is reachable but its configuration store is unavailable. Check APISIX-to-etcd connectivity and etcd health.';
  }

  const statusLabel =
    status === HttpStatusCode.BadRequest
      ? 'Bad Request'
      : status === HttpStatusCode.NotFound
        ? 'Not Found'
        : status === HttpStatusCode.Conflict
          ? 'Conflict'
          : status === HttpStatusCode.InternalServerError
            ? 'Server Error'
            : `Error ${status}`;

  if (apisixMsg) {
    return `${statusLabel}: ${apisixMsg} (${method} ${path})`;
  }

  return `${statusLabel} on ${method} ${path}`;
}

req.interceptors.response.use(
  (res) => {
    if (
      res.data?.list &&
      !Array.isArray(res.data.list) &&
      Object.keys(res.data.list).length === 0
    ) {
      res.data.list = [];
    }
    return res;
  },
  (err) => {
    // Cancelled requests and explicitly skipped failures are handled by the
    // screen that initiated them.
    if (axios.isCancel(err) || matchSkipInterceptor(err)) {
      return Promise.reject(err);
    }

    // Authentication is the one cross-screen failure that needs a central
    // response because recovery always happens in Settings.
    const status = err.response?.status;
    if (
      status === HttpStatusCode.Unauthorized ||
      status === HttpStatusCode.Forbidden
    ) {
      showRateLimitedError(
        'auth-error',
        'Authentication failed — check your Admin Key in Settings'
      );
      getDefaultStore().set(isSettingsOpenAtom, true);
    }

    return Promise.reject(err);
  }
);
