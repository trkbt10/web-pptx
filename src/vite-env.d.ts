/// <reference types="vite/client" />

/**
 * Vite Worker import type declaration
 *
 * When importing with `?worker` suffix, Vite bundles the file as a Web Worker
 * and returns a Worker constructor.
 */
declare module "*?worker" {
  const WorkerConstructor: {
    new (): Worker;
  };
  export default WorkerConstructor;
}
