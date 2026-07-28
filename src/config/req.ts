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

import axios, { AxiosError, type AxiosResponse, HttpStatusCode } from 'axios';
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
  return interceptors.some((v: string) => v === failureType);
};

const getErrorNotificationId = (
  err: AxiosError<APISIXRespErr>,
  message: string
) => {
  const status = err.response?.status;

  // A gateway outage often makes several resource requests fail together.
  // Present that as one incident instead of stacking one card per endpoint.
  if (status && status >= 500) return `admin-api-server-error-${status}`;

  return message;
};

/** Build a human-readable error message with context */
function buildErrorMessage(err: AxiosError<APISIXRespErr>): string {
  const method = err.config?.method?.toUpperCase() ?? '';
  const path = err.config?.url ?? '';
  const status = err.response?.status;
  const apisixMsg = err.response?.data?.error_msg || err.response?.data?.message;

  // Network error (server unreachable)
  if (!err.response) {
    return `Network error: Cannot reach APISIX (${method} ${path}). Check that APISIX is running.`;
  }

  if (status === 503) {
    return apisixMsg
      ? `APISIX Admin API is reachable but its configuration store is unavailable: ${apisixMsg}`
      : 'APISIX Admin API is reachable but its configuration store is unavailable. Check APISIX-to-etcd connectivity and etcd health.';
  }

  const statusLabel =
    status === 400 ? 'Bad Request' :
    status === 404 ? 'Not Found' :
    status === 409 ? 'Conflict' :
    status === 500 ? 'Server Error' :
    status === 503 ? 'Service Unavailable' :
    `Error ${status}`;

  // APISIX returned an error message
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
    // Don't show error for cancelled requests (e.g., Admin Key not configured)
    if (axios.isCancel(err)) {
      return Promise.reject(err);
    }

    if (err.response) {
      if (matchSkipInterceptor(err)) return Promise.reject(err);
      const res = err.response as AxiosResponse<APISIXRespErr>;

      if (res.status === HttpStatusCode.Unauthorized) {
        showRateLimitedError(
          'auth-error',
          'Authentication failed — check your Admin Key in Settings'
        );
        getDefaultStore().set(isSettingsOpenAtom, true);
      } else {
        const message = buildErrorMessage(err as AxiosError<APISIXRespErr>);
        showRateLimitedError(
          res.status === HttpStatusCode.ServiceUnavailable
            ? 'admin-api-config-store-unavailable'
            : getErrorNotificationId(
                err as AxiosError<APISIXRespErr>,
                message
              ),
          message
        );
      }
    } else {
      // Network error — no response at all
      const message = buildErrorMessage(err as AxiosError<APISIXRespErr>);
      showRateLimitedError('network-error', message);
    }

    return Promise.reject(err);
  }
);
