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

import { FormItemNumberInput } from '@/components/form/NumberInput';
import { FormItemSelect } from '@/components/form/Select';
import { FormItemSwitch } from '@/components/form/Switch';
import { FormItemTextareaWithUpload } from '@/components/form/TextareaWithUpload';
import { FormItemTextInput } from '@/components/form/TextInput';
import { APISIX } from '@/types/schema/apisix';
import { useNamePrefix } from '@/utils/useNamePrefix';

import { FormPartBasic } from '../FormPartBasic';
import { FormSection } from '../FormSection';
import { FormItemNodes } from './FormItemNodes';
import { FormSectionChecks } from './FormSectionChecks';
import { FormSectionDiscovery } from './FormSectionDiscovery';
import type { FormPartUpstreamType } from './schema';

export const FormSectionTLS = () => {
  const { control } = useFormContext<FormPartUpstreamType>();
  const np = useNamePrefix();

  return (
    <FormSection legend="TLS">
      <FormItemSwitch
        control={control}
        name={np('tls.verify')}
        label="Verify"
      />
      <FormSection legend="Client Cert Key Pair">
        <FormItemTextareaWithUpload
          control={control}
          name={np('tls.client_cert')}
          label="Client Cert"
        />
        <FormItemTextareaWithUpload
          control={control}
          name={np('tls.client_key')}
          label="Client Key"
        />
        <Divider style={{ margin: '8px 0' }}>OR</Divider>
        <FormItemTextInput
          control={control}
          name={np('tls.client_cert_id')}
          label="Client Cert ID"
        />
      </FormSection>
    </FormSection>
  );
};

export const FormItemScheme = () => {
  const { control } = useFormContext<FormPartUpstreamType>();
  const np = useNamePrefix();
  return (
    <FormItemSelect
      control={control}
      name={np('scheme')}
      label="Scheme"
      defaultValue={APISIX.UpstreamSchemeL7.options[0].value}
      data={[
        {
          group: 'L7',
          items: APISIX.UpstreamSchemeL7.options.map((v) => v.value),
        },
        {
          group: 'L4',
          items: APISIX.UpstreamSchemeL4.options.map((v) => v.value),
        },
      ]}
    />
  );
};

export const FormSectionLoadbalancing = () => {
  const { control } = useFormContext<FormPartUpstreamType>();
  const np = useNamePrefix();
  return (
    <FormSection legend="Load Balancing">
      <FormItemSelect
        control={control}
        name={np('type')}
        label="Type"
        defaultValue={APISIX.UpstreamBalancer.options[0].value}
        data={APISIX.UpstreamBalancer.options.map((v) => v.value)}
      />
      <FormItemSelect
        control={control}
        name={np('hash_on')}
        label="Hash On"
        defaultValue={APISIX.UpstreamHashOn.options[0].value}
        data={APISIX.UpstreamHashOn.options.map((v) => v.value)}
        description="This will be valid when `type` is `chash`"
      />
      <FormItemTextInput
        control={control}
        name={np('key')}
        label="Key"
        description="This will be valid when `type` is `chash`"
      />
    </FormSection>
  );
};

export const FormSectionPassHost = () => {
  const { control } = useFormContext<FormPartUpstreamType>();
  const np = useNamePrefix();
  return (
    <FormSection legend="Pass Host">
      <FormItemSelect
        control={control}
        name={np('pass_host')}
        label="Pass Host"
        defaultValue={APISIX.UpstreamPassHost.options[0].value}
        data={APISIX.UpstreamPassHost.options.map((v) => v.value)}
      />
      <FormItemTextInput
        control={control}
        name={np('upstream_host')}
        label="Upstream Host"
        description="Set this when `pass_host` is `rewrite`"
      />
    </FormSection>
  );
};

export const FormSectionRetry = () => {
  const { control } = useFormContext<FormPartUpstreamType>();
  const np = useNamePrefix();
  return (
    <FormSection legend="Retry">
      <FormItemNumberInput
        control={control}
        name={np('retries')}
        label="Retries"
        allowDecimal={false}
      />
      <FormItemNumberInput
        control={control}
        name={np('retry_timeout')}
        label="Retry timeout"
        suffix="s"
        allowDecimal={false}
      />
    </FormSection>
  );
};

export const FormSectionTimeout = () => {
  const { control } = useFormContext<FormPartUpstreamType>();
  const np = useNamePrefix();
  return (
    <FormSection legend="Timeout">
      <FormItemNumberInput
        control={control}
        name={np('timeout.connect')}
        label="Connect"
        suffix="s"
      />
      <FormItemNumberInput
        control={control}
        name={np('timeout.send')}
        label="Send"
        suffix="s"
      />
      <FormItemNumberInput
        control={control}
        name={np('timeout.read')}
        label="Read"
        suffix="s"
      />
    </FormSection>
  );
};

export const FormSectionKeepAlive = () => {
  const { control } = useFormContext<FormPartUpstreamType>();
  const np = useNamePrefix();
  return (
    <FormSection legend="Keepalive Pool">
      <FormItemNumberInput
        control={control}
        name={np('keepalive_pool.size')}
        label="Size"
      />
      <FormItemNumberInput
        control={control}
        name={np('keepalive_pool.idle_timeout')}
        label="IDLE Timeout"
        suffix="s"
      />
      <FormItemNumberInput
        control={control}
        name={np('keepalive_pool.requests')}
        label="Requests"
        allowDecimal={false}
      />
    </FormSection>
  );
};

export const FormPartUpstream = () => {
  const np = useNamePrefix();
  return (
    <>
      <FormPartBasic />
      <FormSection legend="Find Upstream From">
        <FormSection legend="Nodes">
          <FormItemNodes name={np('nodes')} required />
        </FormSection>
        <Divider style={{ margin: '8px 0' }}>OR</Divider>
        <FormSectionDiscovery />
      </FormSection>
      <FormSection legend="Connection Configuration">
        <FormItemScheme />
        <FormSectionLoadbalancing />
        <FormSectionPassHost />
        <FormSectionRetry />
        <FormSectionTimeout />
        <FormSectionKeepAlive />
        <FormSectionTLS />
      </FormSection>

      <FormSectionChecks />
    </>
  );
};
