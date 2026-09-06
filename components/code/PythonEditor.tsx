"use client";

import dynamic from "next/dynamic";
import type { PythonEditorInnerProps } from "./PythonEditorInner";

// CodeMirror (~200-250 KB gz) is the only thing behind this file. Loading it
// via next/dynamic with ssr:false keeps it off every page that doesn't use it
// and removes the SSR/hydration surface. Swapping to a <textarea> later is a
// one-file change (PythonEditorInner).
const PythonEditorInner = dynamic(() => import("./PythonEditorInner"), {
  ssr: false,
  loading: () => (
    <div className="min-h-[12rem] animate-pulse rounded-md border border-border bg-canvas" />
  ),
});

export type PythonEditorProps = PythonEditorInnerProps;

export function PythonEditor(props: PythonEditorProps) {
  return <PythonEditorInner {...props} />;
}
