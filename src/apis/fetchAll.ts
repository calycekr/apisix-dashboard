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
import type { AxiosInstance } from 'axios';

import { req } from '@/config/req';

/**
 * Fetch all items from a paginated APISIX Admin API endpoint.
 * Fetches page 1 with page_size=100, then fetches remaining pages in parallel.
 */
export async function fetchAllResources<T>(
  fetcher: (
    r: AxiosInstance,
    params: { page: number; page_size: number }
  ) => Promise<{ list: Array<{ value: T }>; total: number }>
): Promise<T[]> {
  const first = await fetcher(req, { page: 1, page_size: 100 });
  const items = first.list.map((i) => i.value);
  const totalPages = Math.ceil(first.total / 100);
  if (totalPages > 1) {
    const rest = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, i) =>
        fetcher(req, { page: i + 2, page_size: 100 })
      )
    );
    for (const page of rest) {
      items.push(...page.list.map((i) => i.value));
    }
  }
  return items;
}
