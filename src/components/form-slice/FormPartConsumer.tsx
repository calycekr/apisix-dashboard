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

export const FormSectionPluginsOnly = () => {
  return (
    <FormSection legend="Plugins" collapsible defaultOpen={false}>
      <FormItemPlugins name="plugins" />
    </FormSection>
  );
};

export const FormPartConsumer = () => {
  const { control } = useFormContext<APISIXType['ConsumerPut']>();

  return (
    <>
      <FormPartBasic
        showName={false}
        before={
          <FormItemTextInput
            control={control}
            name="username"
            label="Username"
            required
          />
        }
      />
      <ResourceSelect
        control={control}
        name="group_id"
        resourceApi={API_CONSUMER_GROUPS}
        resourceLabel="Consumer Group"
      />
      <FormSectionPluginsOnly />
    </>
  );
};
