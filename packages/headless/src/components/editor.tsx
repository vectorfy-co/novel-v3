import { EditorProvider } from "@tiptap/react";
import type { EditorProviderProps, JSONContent } from "@tiptap/react";
import { Provider } from "jotai";
import { forwardRef } from "react";
import type { FC, ReactNode } from "react";
import { novelStore } from "../utils/store";
import { EditorCommandPortalContext, useEditorCommandPortal } from "./editor-command";

export interface EditorProps {
  readonly children: ReactNode;
  readonly className?: string;
}

interface EditorRootProps {
  readonly children: ReactNode;
}

export const EditorRoot: FC<EditorRootProps> = ({ children }) => {
  const portalContext = useEditorCommandPortal();

  return (
    <Provider store={novelStore}>
      <EditorCommandPortalContext.Provider value={portalContext}>{children}</EditorCommandPortalContext.Provider>
    </Provider>
  );
};

export type EditorContentProps = Omit<EditorProviderProps, "content"> & {
  readonly children?: ReactNode;
  readonly className?: string;
  readonly initialContent?: JSONContent;
};

export const EditorContent = forwardRef<HTMLDivElement, EditorContentProps>(
  ({ className, children, initialContent, immediatelyRender = false, ...rest }, ref) => (
    <div ref={ref} className={className}>
      <EditorProvider {...rest} immediatelyRender={immediatelyRender} content={initialContent}>
        {children}
      </EditorProvider>
    </div>
  ),
);

EditorContent.displayName = "EditorContent";
