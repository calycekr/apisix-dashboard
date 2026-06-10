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
import {
  Alert,
  Button,
  Card,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Switch,
  theme,
  Tooltip,
  Typography,
} from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { getSchemaControlKind } from '@/components/schema-form/schemaControls';
import {
  getActiveRequiredFields,
  getResolvedSchema,
  getSchemaProperties,
  type JSONSchema,
  validateSchemaValue,
} from '@/components/schema-form/schemaValidation';
import IconAdd from '~icons/material-symbols/add';
import IconDelete from '~icons/material-symbols/delete-forever-outline';
import IconInfo from '~icons/material-symbols/info-outline';

export type SchemaFormProps = {
  schema: Record<string, unknown>;
  value: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
  disabled?: boolean;
  prefix?: string;
  requiredFields?: string[];
  rootSchema?: JSONSchema;
};

type JSONSchemaProperty = JSONSchema;

type FieldRendererProps = {
  fieldKey: string;
  schema: JSONSchemaProperty;
  value: unknown;
  onChange: (val: unknown) => void;
  disabled?: boolean;
  required?: boolean;
  rootSchema: JSONSchema;
};

const FieldLabel = ({
  label,
  description,
  required,
}: {
  label: string;
  description?: string;
  required?: boolean;
}) => {
  const { token } = theme.useToken();
  return (
    <div style={{ marginBottom: 4 }}>
      <Typography.Text>
        {required && (
          <span style={{ color: token.colorError, marginRight: 4 }}>*</span>
        )}
        {label}
        {description && (
          <Tooltip title={description}>
            <IconInfo style={{ marginLeft: 6, color: token.colorTextSecondary, cursor: 'help', fontSize: 14 }} />
          </Tooltip>
        )}
      </Typography.Text>
    </div>
  );
};

const FieldWrapper = ({
  fieldKey,
  schema,
  required,
  children,
}: {
  fieldKey: string;
  schema: JSONSchemaProperty;
  required?: boolean;
  children: React.ReactNode;
}) => {
  const label = schema.title || fieldKey;
  return (
    <div style={{ marginBottom: 16 }}>
      <FieldLabel label={label} description={schema.description} required={required} />
      {children}
    </div>
  );
};

const ArrayOfObjectsField = ({
  fieldKey,
  schema,
  value,
  onChange,
  disabled,
  required,
  rootSchema,
}: FieldRendererProps) => {
  const { token } = theme.useToken();
  const items = useMemo(
    () => Array.isArray(value) ? (value as Record<string, unknown>[]) : [],
    [value]
  );
  const itemSchema = schema.items as JSONSchemaProperty | undefined;

  const handleAdd = useCallback(() => {
    onChange([
      ...items,
      (itemSchema
        ? defaultForSchema(itemSchema, rootSchema)
        : {}) as Record<string, unknown>,
    ]);
  }, [itemSchema, items, onChange, rootSchema]);

  const handleRemove = useCallback((index: number) => {
    const next = items.filter((_, i) => i !== index);
    onChange(next);
  }, [items, onChange]);

  const handleItemChange = useCallback((index: number, itemVal: Record<string, unknown>) => {
    const next = items.map((item, i) => (i === index ? itemVal : item));
    onChange(next);
  }, [items, onChange]);

  return (
    <FieldWrapper fieldKey={fieldKey} schema={schema} required={required}>
      <Space direction="vertical" style={{ width: '100%' }}>
        {items.map((item, index) => (
          <Card
            key={index}
            size="small"
            style={{ background: token.colorFillAlter }}
            extra={
              !disabled && (
                <Button
                  type="text"
                  danger
                  size="small"
                  icon={<IconDelete />}
                  onClick={() => handleRemove(index)}
                  disabled={
                    schema.minItems !== undefined &&
                    items.length <= schema.minItems
                  }
                />
              )
            }
          >
            {itemSchema &&
            Object.keys(
              getSchemaProperties(itemSchema, rootSchema, item)
            ).length > 0 ? (
              <SchemaForm
                schema={itemSchema}
                value={item}
                onChange={(val) => handleItemChange(index, val)}
                disabled={disabled}
                requiredFields={itemSchema.required}
                rootSchema={rootSchema}
              />
            ) : (
              <Input
                value={String(item ?? '')}
                disabled={disabled}
                onChange={(e) => {
                  const next = items.map((v, i) => (i === index ? e.target.value : v));
                  onChange(next);
                }}
              />
            )}
          </Card>
        ))}
        {!disabled && (
          <Button
            type="dashed"
            onClick={handleAdd}
            icon={<IconAdd />}
            size="small"
            disabled={
              schema.maxItems !== undefined &&
              items.length >= schema.maxItems
            }
          >
            Add item
          </Button>
        )}
      </Space>
    </FieldWrapper>
  );
};

const schemaType = (schema: JSONSchemaProperty): string | undefined =>
  Array.isArray(schema.type)
    ? schema.type[0]
    : schema.type ??
      (schema.properties ? 'object' : schema.items ? 'array' : undefined);

const defaultForSchema = (
  schema: JSONSchemaProperty,
  rootSchema = schema
): unknown => {
  const resolvedSchema = getResolvedSchema(schema, rootSchema);
  if ('default' in resolvedSchema) return resolvedSchema.default;
  const type = schemaType(resolvedSchema);
  if (type === 'object') {
    return Object.fromEntries(
      Object.entries(getSchemaProperties(resolvedSchema, rootSchema))
        .map(([key, propertySchema]) => [
          key,
          defaultForSchema(propertySchema, rootSchema),
        ])
        .filter(([, value]) => value !== undefined)
    );
  }
  if (type === 'array') return [];
  if (type === 'boolean') return false;
  return undefined;
};

const inputPlaceholder = (
  schema: JSONSchemaProperty,
  controlKind: ReturnType<typeof getSchemaControlKind>
): string | undefined => {
  if (schema.format === 'uri') return 'https://example.com/path';
  if (schema.format === 'email') return 'name@example.com';
  if (controlKind === 'password') {
    return 'Enter a value or $secret:// reference';
  }
  return undefined;
};

const FreeFormJsonField = ({
  fieldKey,
  schema,
  value,
  onChange,
  disabled,
  required,
}: FieldRendererProps) => {
  const expectedType = schemaType(schema);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState(() =>
    typeof value === 'string' ? value : JSON.stringify(value ?? {}, null, 2)
  );

  useEffect(() => {
    if (typeof value !== 'string') {
      setText(JSON.stringify(value ?? {}, null, 2));
      setError(null);
    }
  }, [value]);

  const handleChange = (nextText: string) => {
    setText(nextText);
    try {
      const parsed = JSON.parse(nextText) as unknown;
      const isExpectedType =
        expectedType === 'array' ? Array.isArray(parsed) :
        expectedType === 'object' ? !!parsed && typeof parsed === 'object' && !Array.isArray(parsed) :
        true;
      if (!isExpectedType) {
        setError(`Value must be a JSON ${expectedType}.`);
        onChange(nextText);
        return;
      }
      setError(null);
      onChange(parsed);
    } catch {
      setError('JSON format is not valid.');
      onChange(nextText);
    }
  };

  return (
    <FieldWrapper fieldKey={fieldKey} schema={schema} required={required}>
      <Input.TextArea
        value={text}
        onChange={(event) => handleChange(event.target.value)}
        disabled={disabled}
        status={error ? 'error' : undefined}
        autoSize={{ minRows: 3, maxRows: 10 }}
      />
      {error && (
        <Alert
          type="error"
          showIcon
          message={error}
          style={{ marginTop: 8 }}
        />
      )}
    </FieldWrapper>
  );
};

const ArrayOfScalarsField = ({
  fieldKey,
  schema,
  value,
  onChange,
  disabled,
  required,
  rootSchema,
}: FieldRendererProps) => {
  const items = Array.isArray(value) ? value : [];
  const itemSchema = schema.items ?? {};
  const itemType = schemaType(itemSchema);

  const updateItem = (index: number, itemValue: unknown) => {
    onChange(items.map((item, itemIndex) =>
      itemIndex === index ? itemValue : item
    ));
  };

  const defaultItem = defaultForSchema(itemSchema, rootSchema) ??
    (itemType === 'number' || itemType === 'integer' ? 0 :
      itemType === 'boolean' ? false : '');

  return (
    <FieldWrapper fieldKey={fieldKey} schema={schema} required={required}>
      <Space direction="vertical" style={{ width: '100%' }}>
        {items.map((item, index) => (
          <Space key={index} style={{ width: '100%' }}>
            {itemSchema.enum ? (
              <Select
                options={itemSchema.enum.map((option) => ({
                  label: String(option),
                  value: option as string | number | boolean,
                }))}
                value={item as string | number | boolean}
                onChange={(nextValue) => updateItem(index, nextValue)}
                disabled={disabled}
                style={{ width: 320 }}
              />
            ) : itemType === 'number' || itemType === 'integer' ? (
              <InputNumber
                value={item as number}
                onChange={(nextValue) => updateItem(index, nextValue)}
                min={itemSchema.minimum}
                max={itemSchema.maximum}
                precision={itemType === 'integer' ? 0 : undefined}
                disabled={disabled}
                style={{ width: 320 }}
              />
            ) : itemType === 'boolean' ? (
              <Switch
                checked={Boolean(item)}
                onChange={(nextValue) => updateItem(index, nextValue)}
                disabled={disabled}
              />
            ) : (
              <Input
                value={String(item ?? '')}
                onChange={(event) => updateItem(index, event.target.value)}
                maxLength={itemSchema.maxLength}
                disabled={disabled}
                style={{ width: 320 }}
              />
            )}
            {!disabled && (
              <Button
                type="text"
                danger
                size="small"
                icon={<IconDelete />}
                onClick={() => onChange(
                  items.filter((_, itemIndex) => itemIndex !== index)
                )}
                disabled={
                  schema.minItems !== undefined &&
                  items.length <= schema.minItems
                }
              />
            )}
          </Space>
        ))}
        {!disabled && (
          <Button
            type="dashed"
            size="small"
            icon={<IconAdd />}
            onClick={() => onChange([...items, defaultItem])}
            disabled={
              schema.maxItems !== undefined &&
              items.length >= schema.maxItems
            }
          >
            Add item
          </Button>
        )}
      </Space>
    </FieldWrapper>
  );
};

const OneOfField = ({
  fieldKey,
  schema,
  value,
  onChange,
  disabled,
  required,
  rootSchema,
}: FieldRendererProps) => {
  const variants = useMemo(
    () => (schema.oneOf || schema.anyOf) ?? [],
    [schema.anyOf, schema.oneOf]
  );

  const detectedIndex = useMemo(() => {
    const exact = variants.findIndex(
      (variant) =>
        validateSchemaValue(variant, value, '', rootSchema).length === 0
    );
    return exact >= 0 ? exact : 0;
  }, [rootSchema, value, variants]);

  const [selectedIndex, setSelectedIndex] = useState(detectedIndex);
  const selectedVariant = variants[selectedIndex] ?? variants[0];

  useEffect(() => {
    setSelectedIndex(detectedIndex);
  }, [detectedIndex]);

  const options = variants.map((v, i) => ({
    label: v.title || (schemaType(v) ? `${schemaType(v)} value` : `Option ${i + 1}`),
    value: i,
  }));

  const handleVariantChange = useCallback((idx: number) => {
    const hasData = value !== undefined && value !== null && value !== '';
    const applyVariant = () => {
      setSelectedIndex(idx);
      onChange(defaultForSchema(variants[idx] ?? {}, rootSchema));
    };
    if (hasData) {
      Modal.confirm({
        title: 'Switch variant?',
        content: 'Switching will clear the current configuration for this field.',
        okText: 'Switch',
        cancelText: 'Cancel',
        onOk: applyVariant,
      });
    } else {
      applyVariant();
    }
  }, [onChange, rootSchema, value, variants]);

  return (
    <FieldWrapper fieldKey={fieldKey} schema={schema} required={required}>
      <Select
        options={options}
        value={selectedIndex}
        onChange={handleVariantChange}
        disabled={disabled}
        style={{ width: '100%', marginBottom: 12 }}
      />
      {selectedVariant && (
        <FieldRenderer
          fieldKey={selectedVariant.title || 'Value'}
          schema={selectedVariant}
          value={value}
          onChange={onChange}
          disabled={disabled}
          rootSchema={rootSchema}
        />
      )}
    </FieldWrapper>
  );
};

const FieldRenderer = ({
  fieldKey,
  schema,
  value,
  onChange,
  disabled,
  required,
  rootSchema,
}: FieldRendererProps) => {
  const resolvedSchema = getResolvedSchema(schema, rootSchema);
  const effectiveType = schemaType(resolvedSchema);
  const schemaProperties = getSchemaProperties(
    resolvedSchema,
    rootSchema,
    value
  );
  const controlKind = getSchemaControlKind(
    fieldKey,
    resolvedSchema,
    rootSchema
  );

  // oneOf / anyOf
  if (controlKind === 'union') {
    return (
      <OneOfField
        fieldKey={fieldKey}
        schema={resolvedSchema}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        rootSchema={rootSchema}
      />
    );
  }

  // Objects with dynamic keys are edited as JSON so no schema-defined
  // provider option or authentication key is hidden from the user.
  if (
    controlKind === 'json'
  ) {
    return (
      <FreeFormJsonField
        fieldKey={fieldKey}
        schema={resolvedSchema}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        rootSchema={rootSchema}
      />
    );
  }

  // object
  if (controlKind === 'object') {
    return (
      <FieldWrapper
        fieldKey={fieldKey}
        schema={resolvedSchema}
        required={required}
      >
        <Card size="small" style={{ marginBottom: 0 }}>
          <SchemaForm
            schema={{ ...resolvedSchema, properties: schemaProperties }}
            value={(value as Record<string, unknown>) ?? {}}
            onChange={onChange}
            disabled={disabled}
            rootSchema={rootSchema}
          />
        </Card>
      </FieldWrapper>
    );
  }

  // array of objects
  if (
    controlKind === 'object-array'
  ) {
    return (
      <ArrayOfObjectsField
        fieldKey={fieldKey}
        schema={resolvedSchema}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        rootSchema={rootSchema}
      />
    );
  }

  // array of strings → tags select
  if (
    controlKind === 'scalar-array' ||
    controlKind === 'multi-select' ||
    controlKind === 'tags'
  ) {
    const itemSchema = resolvedSchema.items
      ? getResolvedSchema(resolvedSchema.items, rootSchema)
      : undefined;
    const itemEnum = itemSchema?.enum;

    if (controlKind === 'scalar-array') {
      return (
        <ArrayOfScalarsField
          fieldKey={fieldKey}
          schema={{ ...resolvedSchema, items: itemSchema }}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          rootSchema={rootSchema}
        />
      );
    }

    return (
      <FieldWrapper
        fieldKey={fieldKey}
        schema={resolvedSchema}
        required={required}
      >
        <Select
          mode={controlKind === 'multi-select' ? 'multiple' : 'tags'}
          options={itemEnum?.map((item) => ({
            label: String(item),
            value: item as string | number,
          }))}
          value={Array.isArray(value) ? value : []}
          onChange={onChange}
          disabled={disabled}
          style={{ width: '100%' }}
          maxCount={resolvedSchema.maxItems}
        />
      </FieldWrapper>
    );
  }

  // string with enum → Select
  if (controlKind === 'select') {
    const options = (resolvedSchema.enum ?? []).map((v) => ({
      label: String(v),
      value: v as string | number | boolean,
    }));
    return (
      <FieldWrapper
        fieldKey={fieldKey}
        schema={resolvedSchema}
        required={required}
      >
        <Select
          options={options}
          value={value as string | number | undefined}
          onChange={onChange}
          disabled={disabled}
          style={{ width: '100%' }}
          allowClear
        />
      </FieldWrapper>
    );
  }

  // number / integer
  if (controlKind === 'number') {
    return (
      <FieldWrapper
        fieldKey={fieldKey}
        schema={resolvedSchema}
        required={required}
      >
        <InputNumber
          value={value as number | undefined}
          onChange={onChange}
          min={resolvedSchema.minimum}
          max={resolvedSchema.maximum}
          precision={effectiveType === 'integer' ? 0 : undefined}
          disabled={disabled}
          style={{ width: '100%' }}
        />
      </FieldWrapper>
    );
  }

  // boolean
  if (controlKind === 'boolean') {
    return (
      <FieldWrapper
        fieldKey={fieldKey}
        schema={resolvedSchema}
        required={required}
      >
        <Switch
          checked={!!value}
          onChange={onChange}
          disabled={disabled}
        />
      </FieldWrapper>
    );
  }

  // string (default)
  const maxLength = resolvedSchema.maxLength;
  const placeholder = inputPlaceholder(resolvedSchema, controlKind);

  return (
    <FieldWrapper
      fieldKey={fieldKey}
      schema={resolvedSchema}
      required={required}
    >
      {controlKind === 'textarea' ? (
        <Input.TextArea
          value={value as string | undefined}
          onChange={(e) => onChange(e.target.value)}
          maxLength={maxLength}
          minLength={resolvedSchema.minLength}
          disabled={disabled}
          placeholder={placeholder}
          autoSize={{ minRows: 3, maxRows: 8 }}
        />
      ) : controlKind === 'password' ? (
        <Input.Password
          value={value as string | undefined}
          onChange={(e) => onChange(e.target.value)}
          maxLength={maxLength}
          disabled={disabled}
          placeholder={placeholder}
        />
      ) : (
        <Input
          type={controlKind === 'email' ? 'email' : controlKind === 'url' ? 'url' : 'text'}
          value={value as string | undefined}
          onChange={(e) => onChange(e.target.value)}
          maxLength={maxLength}
          disabled={disabled}
          placeholder={placeholder}
        />
      )}
    </FieldWrapper>
  );
};

export const SchemaForm = ({
  schema,
  value,
  onChange,
  disabled,
  requiredFields,
  rootSchema,
}: SchemaFormProps) => {
  const s = schema as JSONSchemaProperty;
  const root = rootSchema ?? s;
  const properties = getSchemaProperties(s, root, value);

  if (Object.keys(properties).length === 0) return null;

  const safeValue = value ?? {};
  const required = [
    ...new Set([
      ...(requiredFields ?? []),
      ...getActiveRequiredFields(s, safeValue, root),
    ]),
  ];

  return (
    <div>
      {Object.entries(properties).map(([key, propSchema]) => {
        const ps = getResolvedSchema(
          propSchema as JSONSchemaProperty,
          root
        );
        const rawValue = safeValue[key];
        // Provide safe defaults for nested types to prevent "Cannot read properties of undefined"
        const fieldValue = rawValue ?? ps.default ?? (
          ps.type === 'object' || ps.properties ? {} :
          ps.type === 'array' ? [] :
          undefined
        );
        const isRequired = required.includes(key);

        const handleChange = (val: unknown) => {
          onChange({ ...safeValue, [key]: val });
        };

        return (
          <FieldRenderer
            key={key}
            fieldKey={key}
            schema={propSchema as JSONSchemaProperty}
            value={fieldValue}
            onChange={handleChange}
            disabled={disabled}
            required={isRequired}
            rootSchema={root}
          />
        );
      })}
    </div>
  );
};
