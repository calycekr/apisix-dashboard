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
import { useFormContext } from 'react-hook-form';

import { InputWrapper } from '@/components/form/InputWrapper';
import { FormItemPasswordInput } from '@/components/form/PasswordInput';
import { FormItemSelect } from '@/components/form/Select';
import { FormItemSwitch } from '@/components/form/Switch';
import { FormItemTextInput } from '@/components/form/TextInput';
import { APISIX, type APISIXType } from '@/types/schema/apisix';

import { FormItemTagsInput } from '../form/TagInput';
import { FormSection } from './FormSection';

const VaultSecretForm = () => {
  const { control } = useFormContext<APISIXType['Secret']>();

  return (
    <>
      <FormItemTextInput
        control={control}
        name="uri"
        label="URI"
      />
      <FormItemTextInput
        control={control}
        name="prefix"
        label="Prefix"
      />
      <FormItemPasswordInput
        control={control}
        name="token"
        label="Token"
      />
      <FormItemTextInput
        control={control}
        name="namespace"
        label="Namespace"
      />
    </>
  );
};

const AWSSecretForm = () => {
  const { control } = useFormContext<APISIXType['Secret']>();

  return (
    <>
      <FormItemPasswordInput
        control={control}
        name="access_key_id"
        label="Access Key ID"
      />
      <FormItemPasswordInput
        control={control}
        name="secret_access_key"
        label="Secret Access Key"
      />
      <FormItemPasswordInput
        control={control}
        name="session_token"
        label="Session Token"
      />

      <FormItemTextInput
        control={control}
        name="region"
        label="Region"
      />
      <FormItemTextInput
        control={control}
        name="endpoint_url"
        label="Endpoint URL"
      />
    </>
  );
};

const GCPSecretForm = () => {
  const { control } = useFormContext<APISIXType['Secret']>();

  return (
    <>
      <InputWrapper label="SSL Verify">
        <FormItemSwitch control={control} name="ssl_verify" />
      </InputWrapper>
      <FormSection legend="Auth" collapsible defaultOpen={false}>
        <FormItemTextInput
          control={control}
          name="auth_file"
          label="Auth File"
        />
        <Divider style={{ margin: '8px 0' }}>OR</Divider>
        <FormSection legend="Auth Configuration" collapsible defaultOpen={false}>
          <FormItemTextInput
            control={control}
            name="auth_config.client_email"
            label="Client Email"
          />
          <FormItemPasswordInput
            control={control}
            name="auth_config.private_key"
            label="Private Key"
          />
          <FormItemTextInput
            control={control}
            name="auth_config.project_id"
            label="Project ID"
          />
          <FormItemTextInput
            control={control}
            name="auth_config.token_uri"
            label="Token URI"
          />
          <FormItemTagsInput
            control={control}
            name="auth_config.scope"
            label="Scope"
          />
          <FormItemTextInput
            control={control}
            name="auth_config.entries_uri"
            label="Entries URI"
          />
        </FormSection>
      </FormSection>
    </>
  );
};

type FormSectionManagerProps = { readOnlyManager?: boolean };
const FormSectionManager = (props: FormSectionManagerProps) => {
  const { readOnlyManager } = props;
  const { control } = useFormContext<APISIXType['Secret']>();
  return (
    <FormSection legend="Secret Manager" disabled={readOnlyManager} collapsible defaultOpen={true}>
      <FormItemSelect
        control={control}
        name="manager"
        defaultValue={APISIX.Secret.options[0].shape.manager.value}
        data={APISIX.Secret.options.map((v) => v.shape.manager.value)}
      />
    </FormSection>
  );
};

const FormSectionManagerConfig = () => {
  const { watch } = useFormContext<APISIXType['Secret']>();
  // useWatch not working here
  const manager = watch('manager');
  return (
    <FormSection legend="Manager Configuration" collapsible defaultOpen={true}>
      {manager === 'vault' && <VaultSecretForm />}
      {manager === 'aws' && <AWSSecretForm />}
      {manager === 'gcp' && <GCPSecretForm />}
    </FormSection>
  );
};

/**
 * id and manager cannot be changed when editing
 */
export const FormPartSecret = (props: FormSectionManagerProps) => {
  const { readOnlyManager } = props;
  return (
    <>
      <FormSectionManager readOnlyManager={readOnlyManager} />
      <FormSectionManagerConfig />
    </>
  );
};
