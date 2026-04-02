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
import { Divider } from 'antd';

import { InputWrapper } from '@/components/form/InputWrapper';
import { useFormContext } from 'react-hook-form';

import { FormItemEditor } from '@/components/form/Editor';
import { FormItemNumberInput } from '@/components/form/NumberInput';
import { FormItemSwitch } from '@/components/form/Switch';
import { FormItemTagsInput } from '@/components/form/TagInput';
import { FormItemTextInput } from '@/components/form/TextInput';
import { APISIX } from '@/types/schema/apisix';
import { NamePrefixProvider } from '@/utils/useNamePrefix';
import { zGetDefault } from '@/utils/zod';

import { useFormReadOnlyFields } from '../../../utils/form-context';
import { FormItemPlugins } from '../FormItemPlugins';
import { FormPartBasic } from '../FormPartBasic';
import { FormPartUpstream, FormSectionTimeout } from '../FormPartUpstream';
import { FormSection } from '../FormSection';
import { FormItemVars } from './FormItemVars';
import type { RoutePostType } from './schema';

const FormPartBasicWithPriority = () => {
  const { control } = useFormContext<RoutePostType>();
  return (
    <FormPartBasic showStatus>
      <FormItemNumberInput
        control={control}
        name="priority"
        label="Priority"
        defaultValue={zGetDefault(APISIX.Route).priority!}
      />
    </FormPartBasic>
  );
};

const FormSectionMatchRules = () => {
  const { control } = useFormContext<RoutePostType>();
  return (
    <FormSection legend="Match Rules" collapsible defaultOpen={true}>
      <FormItemTagsInput
        control={control}
        name="methods"
        label="HTTP Methods"
        data={APISIX.HttpMethod.options.map((v) => v.value)}
        searchValue=""
      />
      <InputWrapper label="Enable WebSocket">
        <FormItemSwitch control={control} name="enable_websocket" />
      </InputWrapper>
      <FormItemTextInput
        control={control}
        name="uri"
        label="URI"
        required
      />
      <FormItemTagsInput
        control={control}
        name="uris"
        label="URIs"
      />
      <FormItemTextInput
        control={control}
        name="host"
        label="Host"
      />
      <FormItemTagsInput
        control={control}
        name="hosts"
        label="Hosts"
      />
      <FormItemTextInput
        control={control}
        name="remote_addr"
        label="Remote Address"
      />
      <FormItemTagsInput
        control={control}
        name="remote_addrs"
        label="Remote Addresses"
      />
      <FormItemVars />
      <FormItemEditor
        control={control}
        name="filter_func"
        label="Filter Func"
        language="lua"
      />
    </FormSection>
  );
};

export const FormSectionUpstream = () => {
  const { control } = useFormContext<RoutePostType>();
  return (
    <FormSection legend="Upstream" collapsible defaultOpen={false}>
      <FormSection legend="Upstream ID">
        <FormItemTextInput control={control} name="upstream_id" />
      </FormSection>
      <Divider style={{ margin: '8px 0' }}>OR</Divider>
      <NamePrefixProvider value="upstream">
        <FormPartUpstream />
      </NamePrefixProvider>
    </FormSection>
  );
};

export const FormSectionPlugins = () => {
  const { control } = useFormContext<RoutePostType>();
  return (
    <FormSection legend="Plugins" collapsible defaultOpen={false}>
      <FormItemTextInput
        control={control}
        name="plugin_config_id"
        label="Plugin Config ID"
      />
      <Divider style={{ margin: '8px 0' }}>OR</Divider>
      <FormItemPlugins name="plugins" />
    </FormSection>
  );
};

export const FormSectionScript = () => {
  const { control } = useFormContext<RoutePostType>();
  return (
    <FormSection legend="Script" collapsible defaultOpen={false}>
      <FormItemTextInput
        control={control}
        name="script_id"
        label="Script ID"
      />
      <Divider style={{ margin: '8px 0' }}>OR</Divider>
      <FormItemEditor
        control={control}
        name="script"
        label="Script"
        language="lua"
      />
    </FormSection>
  );
};

export const FormSectionService = () => {
  const { control } = useFormContext<RoutePostType>();
  const readOnlyFields = useFormReadOnlyFields();
  return (
    <FormSection
      legend="Service"
      disabled={readOnlyFields.includes('service_id')}
      collapsible
      defaultOpen={true}
    >
      <FormItemTextInput
        control={control}
        name="service_id"
        label="Service ID"
      />
    </FormSection>
  );
};

export const FormPartRoute = () => {
  return (
    <>
      <FormPartBasicWithPriority />
      <FormSectionMatchRules />
      <FormSectionService />
      <FormSectionTimeout />
      <FormSectionUpstream />
      <FormSectionPlugins />
      <FormSectionScript />
    </>
  );
};
