"use client";

import CodeMirror, { EditorView } from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";

export interface PythonEditorInnerProps {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  minHeight?: string;
}

export default function PythonEditorInner({
  value,
  onChange,
  readOnly = false,
  minHeight = "12rem",
}: PythonEditorInnerProps) {
  return (
    <div className="overflow-hidden rounded-md border border-border">
      <CodeMirror
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        editable={!readOnly}
        minHeight={minHeight}
        basicSetup={{
          // Autocompletion is off on purpose — don't let the editor write the
          // answer for a student who is learning.
          lineNumbers: true,
          foldGutter: false,
          autocompletion: false,
          highlightActiveLine: !readOnly,
        }}
        extensions={[python(), EditorView.lineWrapping]}
        className="text-sm"
      />
    </div>
  );
}
