"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { authClient } from "./auth-client";
import type { StageId } from "./registry";

/** Lưu cục bộ trong trình duyệt (khách). */
export function useLocal<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setValue(JSON.parse(raw) as T);
    } catch {}
    setReady(true);
  }, [key]);
  const set = useCallback(
    (next: T | ((p: T) => T)) => {
      setValue((p) => {
        const v = typeof next === "function" ? (next as (p: T) => T)(p) : next;
        try {
          localStorage.setItem(key, JSON.stringify(v));
        } catch {}
        return v;
      });
    },
    [key],
  );
  return [value, set, ready] as const;
}

/**
 * Khách: lưu trong trình duyệt. Đã đăng nhập: đồng bộ lên máy chủ theo tài khoản
 * (lần đầu, dữ liệu cục bộ được đưa lên nếu tài khoản chưa có gì).
 */
export function useSynced<T>(key: "projects" | "profile" | "survey", initial: T) {
  const { data: session, isPending } = authClient.useSession();
  const uid = session?.user.id;
  const [value, setValue] = useState<T>(initial);
  const [ready, setReady] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lk = `hce.${key}`;

  useEffect(() => {
    if (isPending) return;
    let cancelled = false;
    (async () => {
      let local: T | null = null;
      try {
        const raw = localStorage.getItem(lk);
        if (raw) local = JSON.parse(raw) as T;
      } catch {}
      if (uid) {
        try {
          const r = await fetch(`/api/me/data/${key}`);
          if (r.ok) {
            const j = (await r.json()) as { value: T | null };
            if (!cancelled) {
              if (j.value !== null) setValue(j.value);
              else if (local !== null) {
                setValue(local);
                void fetch(`/api/me/data/${key}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ value: local }) });
              }
            }
          }
        } catch {}
      } else if (local !== null && !cancelled) {
        setValue(local);
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [uid, isPending, key, lk]);

  const set = useCallback(
    (next: T | ((p: T) => T)) => {
      setValue((p) => {
        const v = typeof next === "function" ? (next as (p: T) => T)(p) : next;
        try {
          localStorage.setItem(lk, JSON.stringify(v));
        } catch {}
        if (uid) {
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => {
            void fetch(`/api/me/data/${key}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ value: v }) });
          }, 600);
        }
        return v;
      });
    },
    [uid, key, lk],
  );
  return [value, set, ready] as const;
}

export type StageStatus = "todo" | "doing" | "done";
export type Project = {
  id: string;
  title: string;
  field: string;
  createdAt: string;
  stages: Record<StageId, { status: StageStatus; due: string }>;
  todos: { id: string; text: string; done: boolean }[];
};

export const newId = () => Math.random().toString(36).slice(2, 10);

export const newProject = (title: string, field: string): Project => ({
  id: newId(),
  title,
  field,
  createdAt: new Date().toISOString(),
  stages: { 1: { status: "doing", due: "" }, 2: { status: "todo", due: "" }, 3: { status: "todo", due: "" }, 4: { status: "todo", due: "" }, 5: { status: "todo", due: "" }, 6: { status: "todo", due: "" } },
  todos: [],
});

export const useProjects = () => useSynced<Project[]>("projects", []);

export type Profile = { level: string; unit: string; field: string };
export const useProfile = () => useSynced<Profile>("profile", { level: "", unit: "", field: "" });

export type Question = {
  id: string;
  type: "likert" | "choice" | "open";
  text: string;
  options: string[]; // lựa chọn (choice) hoặc nhãn thang (likert)
};
