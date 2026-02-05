"use client";

import { useSyncExternalStore } from "react";

export const PLATFORM_KEY_STORAGE = "platform_api_key";
export const PLATFORM_KEY_EVENT = "platform:apikey";

export function readPlatformKey(): string {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(PLATFORM_KEY_STORAGE) ?? "";
}

export function writePlatformKey(v: string) {
    if (typeof window === "undefined") return;

    const trimmed = v.trim();
    if (!trimmed) {
        window.localStorage.removeItem(PLATFORM_KEY_STORAGE);
    } else {
        window.localStorage.setItem(PLATFORM_KEY_STORAGE, trimmed);
    }

    window.dispatchEvent(new Event(PLATFORM_KEY_EVENT));
}

function subscribe(cb: () => void): () => void {
    if (typeof window === "undefined") return () => { };

    const handler = () => cb();

    const onStorage = (e: StorageEvent) => {
        if (e.key === PLATFORM_KEY_STORAGE) cb();
    };

    window.addEventListener(PLATFORM_KEY_EVENT, handler);
    window.addEventListener("storage", onStorage);

    return () => {
        window.removeEventListener(PLATFORM_KEY_EVENT, handler);
        window.removeEventListener("storage", onStorage);
    };
}

export function usePlatformKey(): string {
    return useSyncExternalStore(subscribe, readPlatformKey, () => "");
}
