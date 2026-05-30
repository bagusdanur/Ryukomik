export type Dict<T = unknown> = Record<string, T>;

export interface ApiResult<T> {
  data?: T;
  error?: string;
  success?: boolean;
}
