import { createToaster } from "@chakra-ui/react";

/** Short-lived confirmations. Errors stay inline: they need reading and acting on. */
export const toaster = createToaster({ placement: "bottom", pauseOnPageIdle: true });
