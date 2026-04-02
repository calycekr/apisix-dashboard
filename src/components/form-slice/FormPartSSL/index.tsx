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
import { Descriptions, Typography, theme } from 'antd';
import dayjs from 'dayjs';

import { InputWrapper } from '@/components/form/InputWrapper';
import { useFormContext, useWatch } from 'react-hook-form';

import { FormItemNumberInput } from '@/components/form/NumberInput';
import { FormItemSelect } from '@/components/form/Select';
import { FormItemSwitch } from '@/components/form/Switch';
import { FormItemTagsInput } from '@/components/form/TagInput';
import { FormItemTextarea } from '@/components/form/Textarea';
import { FormItemTextInput } from '@/components/form/TextInput';
import { APISIX } from '@/types/schema/apisix';

import { FormPartBasic } from '../FormPartBasic';
import { FormSection } from '../FormSection';
import { FormItemCertKeyList } from './FormItemCertKeyList';
import type { SSLPostType } from './schema';

const FormSectionClient = () => {
  const { control } = useFormContext<SSLPostType>();
  const clientEnabled = useWatch({ control, name: '__clientEnabled' });
  const { token } = theme.useToken();
  return (
    <FormSection
      legend="Client"
      extra={<FormItemSwitch control={control} name="__clientEnabled" />}
      collapsible
      defaultOpen={false}
    >
      {clientEnabled ? (
        <>
          <FormItemTextarea
            control={control}
            label="Client CA Certificate"
            name="client.ca"
          />
          <FormItemNumberInput
            control={control}
            label="Verification Depth"
            name="client.depth"
            defaultValue={1}
            min={0}
          />
          <InputWrapper label="Skip mTLS URI Regex">
            <FormItemSwitch
              control={control}
              name="client.skip_mtls_uri_regex"
            />
          </InputWrapper>
        </>
      ) : (
        <Typography.Text style={{ color: token.colorTextSecondary, fontSize: 14 }}>
          Disabled, click switch to enable
        </Typography.Text>
      )}
    </FormSection>
  );
};
const FormSSLValidity = () => {
  const { control } = useFormContext<SSLPostType & { validity_start?: number; validity_end?: number }>();
  const validityStart = useWatch({ control, name: 'validity_start' as never });
  const validityEnd = useWatch({ control, name: 'validity_end' as never });
  if (!validityStart && !validityEnd) return null;
  return (
    <Descriptions
      bordered
      size="small"
      column={1}
      style={{ marginBottom: 16 }}
      items={[
        ...(validityStart
          ? [{ key: 'validity_start', label: 'Valid From', children: dayjs.unix(Number(validityStart)).format('YYYY-MM-DD HH:mm:ss') }]
          : []),
        ...(validityEnd
          ? [{ key: 'validity_end', label: 'Valid Until', children: dayjs.unix(Number(validityEnd)).format('YYYY-MM-DD HH:mm:ss') }]
          : []),
      ]}
    />
  );
};

export const FormPartSSL = () => {
  const { control } = useFormContext<SSLPostType>();
  return (
    <>
      <FormPartBasic showName={false} showDesc={false} showStatus />
      <FormSSLValidity />
      <FormItemSelect
        control={control}
        name="type"
        label="Certificate Type"
        data={APISIX.SSLType.options.map((v) => v.value.toString())}
        defaultValue={APISIX.SSLType.options[0].value.toString()}
      />
      <FormItemTagsInput
        control={control}
        name="ssl_protocols"
        label="SSL Protocols"
        data={APISIX.SSLProtocols.options.map((v) => v.value.toString())}
      />
      <FormItemTextInput
        control={control}
        label="SNI"
        name="sni"
        placeholder="domain1.com"
      />
      <FormItemTagsInput
        control={control}
        label="SNIs"
        name="snis"
        placeholder="domain1.com, domain2.com"
      />
      <FormItemCertKeyList />
      <FormSectionClient />
    </>
  );
};
