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
import { Tabs as ATabs, type TabsProps as ATabsProps } from 'antd';

export type TabsItem = {
  value: string;
  label: string;
  content?: React.ReactNode;
};
export type TabsProps = {
  defaultValue?: string;
  items: TabsItem[];
  /** Controlled active key (maps to antd activeKey) */
  value?: string;
  onChange?: (value: string) => void;
} & Omit<ATabsProps, 'items' | 'defaultActiveKey' | 'activeKey' | 'onChange'>;

export const Tabs = (props: TabsProps) => {
  const { defaultValue, items, value, onChange, ...rest } = props;
  return (
    <ATabs
      defaultActiveKey={defaultValue || items[0]?.value}
      activeKey={value}
      onChange={onChange}
      destroyInactiveTabPane
      items={items.map((item) => ({
        key: item.value,
        label: item.label,
        children: item.content,
      }))}
      {...rest}
    />
  );
};
