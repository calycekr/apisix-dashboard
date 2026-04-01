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
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  const { control } = useFormContext<SSLPostType>();
  return (
    <PairWrapper>
      <FormItemTextareaWithUpload
        control={control}
        label={`${t('form.ssls.cert')} 1`}
        name="cert"
        required
      />
      <FormItemTextareaWithUpload
        control={control}
        label={`${t('form.ssls.key')} 1`}
        name="key"
        required
      />
    </PairWrapper>
  );
};
const CertKeyPairList = () => {
  const { t } = useTranslation();
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
                {t('form.ssls.cert_key_list.delete')}
              </Button>
            )
          }
        >
          <FormItemTextareaWithUpload
            key={cert.id}
            name={`certs.${idx}`}
            label={`${t('form.ssls.cert')} ${idx + 2}`}
          />
          <FormItemTextareaWithUpload
            key={keys.fields[idx].id}
            name={`keys.${idx}`}
            label={`${t('form.ssls.key')} ${idx + 2}`}
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
          {t('form.ssls.cert_key_list.add')}
        </Button>
      )}
    </>
  );
};
export const FormItemCertKeyList = () => {
  const { t } = useTranslation();
  return (
    <FormSection legend={t('form.ssls.cert_key_list.title')}>
      <RequiredCertKey />
      <CertKeyPairList />
    </FormSection>
  );
};
