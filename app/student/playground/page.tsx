"use client";

import { CodeRunner } from "@/components/code/CodeRunner";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";

const STARTER_CODE = `# Python playground — experiment freely. Nothing here is saved.
name = input("What's your name? ")
print(f"Hello, {name}!")

for i in range(1, 6):
    print(i, "squared is", i ** 2)
`;

export default function PlaygroundPage() {
  return (
    <Container width="wide">
      <PageHeader
        title="Python Playground"
        backHref="/student"
        backLabel="Assignments"
      />
      <p className="mb-4 text-sm text-ink-muted">
        Write and run Python right in your browser. Nothing here is graded,
        saved, or submitted.
      </p>
      <CodeRunner initialCode={STARTER_CODE} />
    </Container>
  );
}
