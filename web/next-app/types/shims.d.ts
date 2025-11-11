declare module "next/link" {
  const Link: any;
  export default Link;
}

declare module "next/app" {
  export type AppProps = any;
}

declare module "swr" {
  export interface SWRConfiguration {
    refreshInterval?: number;
    revalidateOnFocus?: boolean;
    [key: string]: any;
  }
  export interface SWRResponse<T> {
    data: T | undefined;
    error: any;
    isLoading: boolean;
    mutate: (data?: T | Promise<T>, shouldRevalidate?: boolean) => Promise<T | undefined>;
    [key: string]: any;
  }
  export default function useSWR<T>(
    key: any,
    fetcher: any,
    options?: SWRConfiguration,
  ): SWRResponse<T>;
}

declare module "react" {
  export type ReactNode = any;
  export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: any[]): T;
  export function useMemo<T>(factory: () => T, deps: any[]): T;
  export function useState<T>(initialState: T | (() => T)): [T, (value: T | ((prev: T) => T)) => void];
  export function useEffect(effect: () => void | (() => void), deps?: any[]): void;
  const React: any;
  export default React;
}

declare module "react-dom" {
  const ReactDOM: any;
  export default ReactDOM;
}

declare const process: {
  env: Record<string, string | undefined>;
};

declare namespace JSX {
  type Element = any;
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}

declare module "@playwright/test" {
  export interface Page {
    goto(url: string): Promise<void>;
    getByRole(role: string, options?: { name?: string }): Locator;
    getByLabel(text: string): Locator;
    getByText(text: string): Locator;
    [key: string]: any;
  }

  export interface Locator {
    toBeVisible(): Promise<void>;
    [key: string]: any;
  }

  export interface TestContext {
    page: Page;
    [key: string]: any;
  }

  export interface TestFunction {
    (name: string, fn: (args: TestContext) => void | Promise<void>): void;
    describe: (name: string, fn: () => void) => void;
  }

  export const test: TestFunction;

  export function expect(value: any): {
    toBeVisible(): Promise<void>;
    [key: string]: any;
  };

  export function defineConfig(config: any): any;
  export const devices: Record<string, any>;
}

