import { Button, ButtonSpinner } from '@gluestack-ui/themed';
import type { ComponentProps, ReactNode } from 'react';

export type AppButtonProps = Omit<ComponentProps<typeof Button>, 'children'> & {
  children?: ReactNode;
  /** Disables the control; pair with `showSpinner` for async actions. */
  isLoading?: boolean;
  /** When true and `isLoading`, shows the themed spinner before children. */
  showSpinner?: boolean;
};

/**
 * Primary action button: optional loading spinner and disabled state while loading.
 */
export function AppButton({
  isLoading,
  showSpinner = false,
  children,
  ...rest
}: AppButtonProps) {
  const disabled = Boolean(isLoading || rest.isDisabled);
  return (
    <Button {...rest} isDisabled={disabled}>
      {showSpinner && isLoading ? <ButtonSpinner color="$textLight50" /> : null}
      {children}
    </Button>
  );
}
