declare module '@jitsi/react-sdk' {
  import type { ReactNode } from 'react'
  interface JitsiMeetingProps {
    domain: string
    roomName: string
    jwt: string
    userInfo: { displayName: string; email: string }
    configOverwrite?: Record<string, unknown>
    interfaceConfigOverwrite?: Record<string, unknown>
    onReadyToClose?: () => void
    getIFrameRef?: (iframeRef: HTMLIFrameElement) => void
  }
  export const JitsiMeeting: (props: JitsiMeetingProps) => ReactNode
}

declare module 'idb' {
  export interface IDBPDatabase<T = unknown> {
    objectStoreNames: DOMStringList
    createObjectStore(name: string, opts?: { keyPath: string }): unknown
    put(store: string, value: unknown): Promise<void>
    get<TResult = unknown>(store: string, key: string): Promise<TResult>
    getAll<TResult>(store: string): Promise<TResult[]>
    delete(store: string, key: string): Promise<void>
  }
  export function openDB<T>(
    name: string,
    version: number,
    opts: { upgrade: (db: IDBPDatabase<T>, oldVersion: number) => void },
  ): Promise<IDBPDatabase<T>>
}
