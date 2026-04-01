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
import { Button, theme } from 'antd';
import type { PropsWithChildren, ReactNode } from 'react';
import { useFieldArray, useFormContext, useFormState } from 'react-hook-form';

import { FormItemTextareaWithUpload } from '@/components/form/TextareaWithUpload';
import IconDelete from '~icons/material-symbols/delete-forever-outline';

import { FormSection } from '../FormSection';
import type { SSLPostType } from './schema';

const PairWrapper = (
  props: PropsWithChildren & { legend?: ReactNode }
) => {
  const { children, legend } = props;
  const { token } = theme.useToken();
  return (
    <fieldset style={{ padding: 8, marginBottom: 5, border: `1px solid ${token.colorBorder}`, borderRadius: 4 }}>
      {legend && <legend>{legend}</legend>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {children}
      </div>
    </fieldset>
  );
};

const RequiredCertKey = () => {
  const { control } = useFormContext<SSLPostType>();
  return (
    <PairWrapper>
      <FormItemTextareaWithUpload
        control={control}
        label="Certificate 1"
        name="cert"
        required
      />
      <FormItemTextareaWithUpload
        control={control}
        label="Private Key 1"
        name="key"
        required
      />
    </PairWrapper>
  );
};
const CertKeyPairList = () => {
  const certsState = useFormState<SSLPostType>({ name: 'certs' });
  const certs = useFieldArray({
    name: 'certs',
  });
  const keys = useFieldArray({
    name: 'keys',
  });
  return (
    <>
      {certs.fields.map((cert, idx) => (
        <PairWrapper
          key={cert.id}
          legend={
            !certsState.disabled && (
              <Button
                icon={<IconDelete />}
                size="small"
                danger
                onClick={() => {
                  certs.remove(idx);
                  keys.remove(idx);
                }}
              >
                Delete the pair
              </Button>
            )
          }
        >
          <FormItemTextareaWithUpload
            key={cert.id}
            name={`certs.${idx}`}
            label={`Certificate ${idx + 2}`}
          />
          <FormItemTextareaWithUpload
            key={keys.fields[idx].id}
            name={`keys.${idx}`}
            label={`Private Key ${idx + 2}`}
          />
        </PairWrapper>
      ))}
      {!certsState.disabled && (
        <Button
          style={{ marginTop: 16, width: '100%' }}
          size="small"
          onClick={() => {
            keys.append('');
            certs.append('');
          }}
        >
          Add a pair
        </Button>
      )}
    </>
  );
};
export const FormItemCertKeyList = () => {
  return (
    <FormSection legend="Certificate and Key Pairs">
      <RequiredCertKey />
      <CertKeyPairList />
    </FormSection>
  );
};
