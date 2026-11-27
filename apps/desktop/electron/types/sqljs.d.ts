declare module "sql.js" {
  export interface SqlJsConfig {
    locateFile?: (file: string, prefix: string) => string;
  }

  export type SqlValue = number | string | Uint8Array | null;
  export type BindParams = SqlValue[] | Record<string, SqlValue>;

  export interface Statement {
    bind(values?: BindParams): boolean;
    step(): boolean;
    getAsObject(params?: BindParams): Record<string, SqlValue>;
    free(): boolean;
  }

  export interface Database {
    run(sql: string, params?: BindParams): Database;
    prepare(sql: string, params?: BindParams): Statement;
    export(): Uint8Array;
    close(): void;
  }

  export interface SqlJsStatic {
    Database: new (data?: ArrayLike<number> | Buffer | null) => Database;
  }

  export default function initSqlJs(config?: SqlJsConfig): Promise<SqlJsStatic>;
}
