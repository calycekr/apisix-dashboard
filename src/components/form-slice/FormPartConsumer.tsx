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
import { useFormContext } from 'react-hook-form';

import { ResourceSelect } from '@/components/form/ResourceSelect';
import { FormItemTextInput } from '@/components/form/TextInput';
import { API_CONSUMER_GROUPS } from '@/config/constant';
import type { APISIXType } from '@/types/schema/apisix';

import { FormItemPlugins } from './FormItemPlugins';
import { FormPartBasic } from './FormPartBasic';
import { FormSection } from './FormSection';

export const FormSectionPluginsOnly = (props: { help?: string } = {}) => {
  const { help } = props;
  return (
    <FormSection legend="Plugins" collapsible defaultOpen={true}>
      {help && (
        <div
          role="note"
          style={{
            background: 'var(--ant-color-info-bg)',
            border: '1px solid var(--ant-color-info-border)',
            borderRadius: 6,
            color: 'var(--ant-color-text)',
            marginBottom: 12,
            padding: '8px 12px',
          }}
        >
          {help}
        </div>
      )}
      <FormItemPlugins name="plugins" subsystem="http" />
    </FormSection>
  );
};

export const FormPartConsumer = () => {
  const { control } = useFormContext<APISIXType['ConsumerPut']>();

  return (
    <>
      <FormPartBasic
        showID={false}
        showName={false}
        before={
          <FormItemTextInput
            control={control}
            name="username"
            label="Username"
            required
            description="Unique consumer identity. Use letters, numbers, underscores, or hyphens."
          />
        }
      />
      <ResourceSelect
        control={control}
        name="group_id"
        resourceApi={API_CONSUMER_GROUPS}
        resourceLabel="Consumer Group"
        description="Optional. Attach this consumer to a Consumer Group for shared policy."
      />
      <FormSectionPluginsOnly help="Consumer plugins apply to this consumer identity. Authentication credentials are managed separately in the Credentials tab." />
    </>
  );
};
