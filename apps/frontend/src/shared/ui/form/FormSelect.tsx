import {
  type ComponentPropsWithoutRef,
  type ReactNode,
  useId,
} from 'react';
import {
  useController,
  useFormContext,
  type FieldPathByValue,
  type FieldValues,
} from 'react-hook-form';

import { getFieldErrorId } from './fieldIds';
import { FormField } from './FormField';

type SelectValue = ComponentPropsWithoutRef<'select'>['value'];

type FormSelectOption = {
  disabled?: boolean;
  label: string;
  value: string;
};

type FormSelectProps<
  TFieldValues extends FieldValues,
  TName extends FieldPathByValue<TFieldValues, SelectValue> = FieldPathByValue<
    TFieldValues,
    SelectValue
  >,
> = Omit<
  ComponentPropsWithoutRef<'select'>,
  'defaultValue' | 'name' | 'value'
> & {
  icon?: ReactNode;
  label: string;
  name: TName;
  options: readonly FormSelectOption[];
};

export function FormSelect<
  TFieldValues extends FieldValues,
  TName extends FieldPathByValue<TFieldValues, SelectValue> = FieldPathByValue<
    TFieldValues,
    SelectValue
  >,
>({
  icon,
  label,
  name,
  options,
  onBlur,
  onChange,
  className,
  'aria-describedby': ariaDescribedBy,
  ...selectProps
}: FormSelectProps<TFieldValues, TName>) {
  const generatedId = useId();
  const id = `form-select-${String(name).replaceAll('.', '-')}-${generatedId}`;
  const { control } = useFormContext<TFieldValues>();
  const { field, fieldState } = useController({ control, name });
  const error = fieldState.error?.message;
  const describedBy = [ariaDescribedBy, error ? getFieldErrorId(id) : undefined]
    .filter(Boolean)
    .join(' ');
  const selectClassName = [
    'min-h-10 w-full cursor-pointer appearance-none border-0 bg-transparent py-0 pr-3 text-foreground outline-none',
    icon ? 'pl-9' : 'pl-3.5',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <FormField error={error} htmlFor={id} icon={icon} label={label}>
      <select
        {...selectProps}
        aria-describedby={describedBy || undefined}
        className={selectClassName}
        id={id}
        name={field.name}
        onBlur={(event) => {
          field.onBlur();
          onBlur?.(event);
        }}
        onChange={(event) => {
          field.onChange(event);
          onChange?.(event);
        }}
        ref={field.ref}
        value={(field.value ?? '') as SelectValue}
      >
        {options.map((option) => (
          <option disabled={option.disabled} key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FormField>
  );
}
