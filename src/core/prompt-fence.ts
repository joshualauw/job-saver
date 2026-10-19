/** Stops text from closing a fence or opening a new one. */
function escapeForFence(text: string): string {
  return text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Wraps text in an XML-style tag the system prompt can refer to, escaping it so it cannot break out. */
export function fence(tag: string, body: string): string {
  return `<${tag}>\n${escapeForFence(body)}\n</${tag}>`;
}

/**
 * The posting as fenced sections, ready to join into a user message. The text is untrusted content:
 * it belongs in the user message only, never the system prompt.
 */
export function jobTextSections(text: string): string[] {
  return text.trim() === "" ? [] : [fence("job_description", text)];
}
