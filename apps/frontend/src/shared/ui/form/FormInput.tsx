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

type InputValue = ComponentPropsWithoutRef<'input'>['value'];

type FormInputProps<
  TFieldValues extends FieldValues,
  TName extends FieldPathByValue<TFieldValues, InputValue> = FieldPathByValue<
    TFieldValues,
    InputValue
  >,
> = Omit<
  ComponentPropsWithoutRef<'input'>,
  'defaultValue' | 'name' | 'value'
> & {
  endAdornment?: ReactNode;
  icon?: ReactNode;
  label: string;
  name: TName;
};

export function FormInput<
  TFieldValues extends FieldValues,
  TName extends FieldPathByValue<TFieldValues, InputValue> = FieldPathByValue<
    TFieldValues,
    InputValue
  >,
>({
  endAdornment,
  icon,
  label,
  name,
  onBlur,
  onChange,
  className,
  'aria-describedby': ariaDescribedBy,
  ...inputProps
}: FormInputProps<TFieldValues, TName>) {
  const generatedId = useId();
  const id = `form-input-${String(name).replaceAll('.', '-')}-${generatedId}`;
  const { control } = useFormContext<TFieldValues>();
  const { field, fieldState } = useController({ control, name });
  const error = fieldState.error?.message;
  const describedBy = [ariaDescribedBy, error ? getFieldErrorId(id) : undefined]
    .filter(Boolean)
    .join(' ');
  const inputClassName = [
    'min-h-10 w-full border-0 bg-transparent py-0 text-foreground outline-none placeholder:text-muted-foreground/70',
    icon ? 'pl-9' : 'pl-3.5',
    endAdornment ? 'pr-[42px]' : 'pr-3.5',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <FormField error={error} htmlFor={id} icon={icon} label={label}>
      <input
        {...inputProps}
        aria-describedby={describedBy || undefined}
        className={inputClassName}
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
        value={(field.value ?? '') as InputValue}
      />
      {endAdornment}
    </FormField>
  );
}
