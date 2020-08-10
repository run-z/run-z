declare module 'cliui' {

  export interface CliUIColumn {
    readonly text: string;
    readonly width?: number;
    readonly align?: 'right' | 'center';
    readonly padding?: readonly [number, number, number, number];
    readonly border?: boolean;
  }

  export interface CliUI {

    resetOutput(): void;

    div(...columns: (string | CliUIColumn)[]): CliUIColumn[];

    span(...columns: (string | CliUIColumn)[]): void;

    rowToString(row: string, lines: string[]): string[];

    toString(): string;

  }

  export default function cliui(options?: { wrap?: boolean; width?: number }): CliUI;

}
