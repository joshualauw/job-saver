export type ErrorCode = "auth" | "rate_limit" | "schema" | "network" | "missing_columns" | "page_access";

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

/** The current tab cannot be read (restricted page, or no permission for this tab). */
export class PageAccessError extends AppError {
  constructor(message: string, options?: { cause?: unknown }) {
    super("page_access", message, options);
  }
}

export class MissingColumnsError extends AppError {
  readonly columns: readonly string[];

  constructor(columns: readonly string[]) {
    super("missing_columns", `The sheet is missing these header columns: ${columns.join(", ")}. Add them to row 1.`);
    this.columns = columns;
  }
}
