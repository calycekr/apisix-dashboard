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
import { Button, Dropdown, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import i18nProgress from 'virtual:i18n-progress';

import type { Resources } from '@/config/i18n';
import IconLanguage from '~icons/material-symbols/language-chinese-array';

const LangMap: Record<keyof Resources, string> = {
  en: 'English',
  de: 'Deutsch',
  zh: '中文',
  es: 'Español',
  tr: 'Türkçe',
};

const TranslationProgress = ({ lang }: { lang: string }) => {
  const percent = i18nProgress[lang].percent;
  if (typeof percent === 'number' && percent < 100) {
    return (
      <span style={{ color: 'rgba(0,0,0,0.45)' }}>
        ({percent}%)
      </span>
    );
  }
  return null;
};

export const LanguageMenu = () => {
  const { i18n, t } = useTranslation();
  return (
    <Dropdown
      menu={{
        items: [
          ...Object.keys(LangMap).map((lang) => ({
            key: lang,
            disabled: lang === i18n.language,
            label: (
              <>
                {LangMap[lang as keyof Resources]}
                <TranslationProgress lang={lang} />
              </>
            ),
            onClick: async () => {
              await i18n.changeLanguage(lang);
            },
          })),
          { type: 'divider' as const },
          {
            key: 'help-translate',
            label: (
              <Typography.Link
                href="https://github.com/apache/apisix-dashboard/issues/1407"
                target="_blank"
                style={{ fontSize: 12 }}
              >
                {t('help-us-translate')}
              </Typography.Link>
            ),
          },
        ],
      }}
    >
      <Button
        variant="filled"
        color="default"
        size="small"
        icon={<IconLanguage />}
      />
    </Dropdown>
  );
};
