"use client";

import CodeMirror, { EditorView } from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";

// The default fallback highlight style basicSetup wires in is intentionally
// muted. This mirrors a typical native Python editor's palette (VS Code
// Light+-ish) so keywords, strings, etc. actually stand out. Not marked as a
// fallback, so it takes priority over the default one for every tag it covers.
const pythonHighlightStyle = HighlightStyle.define([
  { tag: [tags.keyword, tags.controlKeyword, tags.operatorKeyword, tags.definitionKeyword, tags.moduleKeyword], color: "#af00db", fontWeight: "600" },
  { tag: tags.string, color: "#a31515" },
  { tag: tags.comment, color: "#008000", fontStyle: "italic" },
  { tag: tags.number, color: "#098658" },
  { tag: [tags.bool, tags.null], color: "#0000ff" },
  { tag: [tags.function(tags.variableName), tags.function(tags.definition(tags.variableName))], color: "#795e26" },
  { tag: tags.definition(tags.variableName), color: "#001080" },
  { tag: [tags.className, tags.typeName], color: "#267f99" },
  { tag: tags.operator, color: "#000000" },
]);

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
        extensions={[
          python(),
          EditorView.lineWrapping,
          syntaxHighlighting(pythonHighlightStyle),
        ]}
        className="text-sm"
      />
    </div>
  );
}
