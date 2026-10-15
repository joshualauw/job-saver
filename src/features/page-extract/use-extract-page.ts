import { useMutation } from "@tanstack/react-query";

import { extractActivePage } from "./extract-active-page";

export function useExtractPage() {
  return useMutation({ mutationFn: extractActivePage });
}
