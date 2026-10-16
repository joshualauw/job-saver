import { Portal, Toast, Toaster as ChakraToaster } from "@chakra-ui/react";

import { toaster } from "./toast";

export function Toaster() {
  return (
    <Portal>
      <ChakraToaster toaster={toaster} insetInline="4">
        {(toast) => (
          <Toast.Root width="full">
            <Toast.Indicator />
            <Toast.Title flex="1">{toast.title}</Toast.Title>
            <Toast.CloseTrigger />
          </Toast.Root>
        )}
      </ChakraToaster>
    </Portal>
  );
}
