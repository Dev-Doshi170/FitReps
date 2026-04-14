import { Input, InputField } from '@gluestack-ui/themed';
import type { ComponentProps } from 'react';

type InputProps = ComponentProps<typeof Input>;
type InputFieldProps = ComponentProps<typeof InputField>;

export type AppTextFieldProps = InputFieldProps & {
  /** Props for the outer `Input` wrapper (width, flex, size overrides, etc.). */
  inputProps?: Omit<InputProps, 'children'>;
};

const defaultInput: Pick<InputProps, 'variant' | 'size'> = {
  variant: 'outline',
  size: 'md',
};

/**
 * Standard text field: outline `Input` + `InputField` with shared defaults.
 */
export function AppTextField({ inputProps, ...fieldProps }: AppTextFieldProps) {
  return (
    <Input {...defaultInput} {...inputProps}>
      <InputField {...fieldProps} />
    </Input>
  );
}
