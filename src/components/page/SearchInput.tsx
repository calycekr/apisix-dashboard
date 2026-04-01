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
import { Input } from 'antd';
import { useCallback, useState } from 'react';

import IconSearch from '~icons/material-symbols/search';

type SearchInputProps = {
  onSearch: (value: string) => void;
  placeholder?: string;
  defaultValue?: string;
};

export const SearchInput = ({
  onSearch,
  placeholder = 'Search by name...',
  defaultValue = '',
}: SearchInputProps) => {
  const [value, setValue] = useState(defaultValue);

  const handleSearch = useCallback(
    (val: string) => {
      onSearch(val.trim());
    },
    [onSearch]
  );

  return (
    <Input
      prefix={<IconSearch style={{ opacity: 0.45 }} />}
      placeholder={placeholder}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onPressEnter={() => handleSearch(value)}
      onBlur={() => handleSearch(value)}
      allowClear
      onClear={() => handleSearch('')}
      style={{ width: 240 }}
    />
  );
};
