declare module "next/link" {
  const Link: any;
  export default Link;
}

declare module "next/app" {
  export type AppProps = any;
}

declare module "swr" {
  export default function useSWR<T>(key: any, fetcher: any): { data: T | undefined };
}

declare module "react" {
  export type ReactNode = any;
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

