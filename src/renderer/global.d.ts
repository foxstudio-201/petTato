/// <reference types="svelte" />
/// <reference types="vite/client" />

import type { PettatoApi } from '../preload/index'

declare global {
  interface Window {
    pettato: PettatoApi
  }
}

export {}
