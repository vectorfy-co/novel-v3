import { createFileRoute } from "@tanstack/react-router";
import { NovelEditor } from "../editor/novel-editor";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <main className="page">
      <h1>Novel v3 editor on TanStack Start</h1>
      <p className="lede">
        Type <kbd>/</kbd> for commands and select text for formatting. The panels below update as you type.
      </p>
      <NovelEditor />
    </main>
  );
}
