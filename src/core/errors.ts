export type ErrorCode = "auth" | "rate_limit" | "schema" | "network" | "missing_columns" | "input" | "unexpected";

/** Base class: `message` is always safe to show to the user. */
export class AppError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = new.target.name;
    this.code = code;
  }
}

export class AuthError extends AppError {
  constructor(message: string, options?: { cause?: unknown }) {
    super("auth", message, options);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string, options?: { cause?: unknown }) {
    super("rate_limit", message, options);
  }
}

export class SchemaError extends AppError {
  constructor(message: string, options?: { cause?: unknown }) {
    super("schema", message, options);
  }
}

export class NetworkError extends AppError {
  constructor(message: string, options?: { cause?: unknown }) {
    super("network", message, options);
  }
}

/** Anything we could not classify; the message stays generic and safe to show. */
export class UnexpectedError extends AppError {
  constructor(message: string, options?: { cause?: unknown }) {
    super("unexpected", message, options);
  }
}

/** There is nothing usable to analyze (for example no text has been sent to the panel yet). */
export class InputError extends AppError {
  constructor(message: string, options?: { cause?: unknown }) {
    super("input", message, options);
  }
}

export class MissingColumnsError extends AppError {
  readonly columns: readonly string[];

  constructor(columns: readonly string[]) {
    super("missing_columns", `The sheet is missing these header columns: ${columns.join(", ")}. Add them to row 1.`);
    this.columns = columns;
  }
}
