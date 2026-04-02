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

import { InputWrapper } from '@/components/form/InputWrapper';
import { FormItemSwitch } from '@/components/form/Switch';
import { FormItemTagsInput } from '@/components/form/TagInput';
import { FormItemTextInput } from '@/components/form/TextInput';

import { FormItemPlugins } from '../FormItemPlugins';
import { FormPartBasic } from '../FormPartBasic';
import { FormSectionUpstream } from '../FormPartRoute';
import { FormSection } from '../FormSection';
import type { ServicePostType } from './schema';


const FormSectionPlugins = () => {
  return (
    <FormSection legend="Plugins" collapsible defaultOpen={false}>
      <FormItemPlugins name="plugins" />
    </FormSection>
  );
};

const FormSectionSettings = () => {
  const { control } = useFormContext<ServicePostType>();
  return (
    <FormSection legend="Service Settings" collapsible defaultOpen={true}>
      <InputWrapper label="Enable WebSocket">
        <FormItemSwitch control={control} name="enable_websocket" />
      </InputWrapper>
      <FormItemTextInput
        control={control}
        name="script"
        label="Script"
      />
      <FormItemTagsInput
        control={control}
        name="hosts"
        label="Hosts"
      />
    </FormSection>
  );
};

export const FormPartService = () => {
  return (
    <>
      <FormPartBasic />
      <FormSectionSettings />
      <FormSectionUpstream />
      <FormSectionPlugins />
    </>
  );
};
