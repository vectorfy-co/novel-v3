import { Schema } from "@tiptap/pm/model";
import { EditorState, type Plugin } from "@tiptap/pm/state";
import { describe, expect, it, vi } from "vitest";
import { createImageUpload, handleImageDrop, handleImagePaste, UploadImagesPlugin } from "./upload-images";

const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: { group: "block", content: "inline*" },
    text: { group: "inline" },
    image: { inline: true, group: "inline", attrs: { src: { default: null } } },
  },
  marks: {},
});

const createState = (plugin: Plugin) =>
  EditorState.create({
    schema,
    doc: schema.nodes.doc.create({}, [schema.nodes.paragraph.create({}, schema.text("Hello"))]),
    plugins: [plugin],
  });

const flushPromises = async () => new Promise((resolve) => setTimeout(resolve, 0));

describe("UploadImagesPlugin", () => {
  it("adds and removes decorations", () => {
    const plugin = UploadImagesPlugin({ imageClass: "test" });
    const state = createState(plugin);

    const id = {};
    const addTr = state.tr.setMeta(plugin, { add: { id, pos: 1, src: "data" } });
    const addedState = state.apply(addTr);
    const decos = plugin.getState(addedState);
    expect(decos.find(undefined, undefined, (spec) => spec.id === id)).toHaveLength(1);

    const removeTr = addedState.tr.setMeta(plugin, { remove: { id } });
    const removedState = addedState.apply(removeTr);
    const decosAfter = plugin.getState(removedState);
    expect(decosAfter.find(undefined, undefined, (spec) => spec.id === id)).toHaveLength(0);
  });

  it("creates upload flow and inserts image", async () => {
    const plugin = UploadImagesPlugin({ imageClass: "test" });
    let state = createState(plugin);

    const view = {
      get state() {
        return state;
      },
      set state(next) {
        state = next;
      },
      dispatch(tr: typeof state.tr) {
        state = state.apply(tr);
      },
    } as unknown as { state: EditorState; dispatch: (tr: EditorState["tr"]) => void };

    let resolveUpload: ((value: string) => void) | null = null;
    const uploadPromise = new Promise<string>((resolve) => {
      resolveUpload = resolve;
    });

    const uploadFn = createImageUpload({
      onUpload: async () => uploadPromise,
    });

    const file = new File(["data"], "test.png", { type: "image/png" });
    uploadFn(file, view as never, 1);

    await flushPromises();
    if (!resolveUpload) {
      throw new Error("Upload resolver missing");
    }
    resolveUpload("https://example.com/image.png");
    await flushPromises();

    expect(view.state.doc.toString()).toContain("image");
  });

  it("uses reader result when upload returns object", async () => {
    const plugin = UploadImagesPlugin({ imageClass: "test" });
    let state = createState(plugin);

    const view = {
      get state() {
        return state;
      },
      dispatch(tr: typeof state.tr) {
        state = state.apply(tr);
      },
    } as unknown as { state: EditorState; dispatch: (tr: EditorState["tr"]) => void };

    let resolveUpload: ((value: object) => void) | null = null;
    const uploadPromise = new Promise<object>((resolve) => {
      resolveUpload = resolve;
    });

    const uploadFn = createImageUpload({
      onUpload: async () => uploadPromise,
    });

    const file = new File(["data"], "test.png", { type: "image/png" });
    uploadFn(file, view as never, 1);

    await flushPromises();
    if (!resolveUpload) {
      throw new Error("Upload resolver missing");
    }
    resolveUpload({ ok: true });
    await flushPromises();

    let imageSrc: string | null = null;
    view.state.doc.descendants((node) => {
      if (node.type.name === "image") {
        imageSrc = node.attrs.src;
      }
    });

    expect(imageSrc).toContain("data:image/png");
  });

  it("handles upload failures by removing placeholder", async () => {
    const plugin = UploadImagesPlugin({ imageClass: "test" });
    let state = createState(plugin);

    const view = {
      get state() {
        return state;
      },
      dispatch(tr: typeof state.tr) {
        state = state.apply(tr);
      },
    } as unknown as { state: EditorState; dispatch: (tr: EditorState["tr"]) => void };

    const uploadFn = createImageUpload({
      onUpload: async () => {
        throw new Error("fail");
      },
    });

    const file = new File(["data"], "test.png", { type: "image/png" });
    uploadFn(file, view as never, 1);

    await flushPromises();
    await flushPromises();

    const images: string[] = [];
    view.state.doc.descendants((node) => {
      if (node.type.name === "image") {
        images.push(node.attrs.src);
      }
    });

    expect(images).toHaveLength(0);
  });

  it("handles image paste", () => {
    const uploadFn = vi.fn();
    const view = {
      state: { selection: { from: 1 } },
    } as never;

    const file = new File(["data"], "test.png", { type: "image/png" });
    const event = {
      clipboardData: { files: [file] },
      preventDefault: vi.fn(),
    } as unknown as ClipboardEvent;

    const handled = handleImagePaste(view, event, uploadFn);
    expect(handled).toBe(true);
    expect(uploadFn).toHaveBeenCalled();
  });

  it("returns false when no image is pasted", () => {
    const uploadFn = vi.fn();
    const view = {
      state: { selection: { from: 1 } },
    } as never;

    const event = {
      clipboardData: { files: [] },
      preventDefault: vi.fn(),
    } as unknown as ClipboardEvent;

    const handled = handleImagePaste(view, event, uploadFn);
    expect(handled).toBe(false);
    expect(uploadFn).not.toHaveBeenCalled();
  });

  it("handles image drop", () => {
    const uploadFn = vi.fn();
    const view = {
      state: { selection: { from: 1 } },
      posAtCoords: () => ({ pos: 2 }),
    } as never;

    const file = new File(["data"], "test.png", { type: "image/png" });
    const event = {
      dataTransfer: { files: [file] },
      clientX: 0,
      clientY: 0,
      preventDefault: vi.fn(),
    } as unknown as DragEvent;
    const handled = handleImageDrop(view, event, false, uploadFn);
    expect(handled).toBe(true);
    expect(uploadFn).toHaveBeenCalled();
  });

  it("skips drop when moved", () => {
    const uploadFn = vi.fn();
    const view = {
      state: { selection: { from: 1 } },
      posAtCoords: () => ({ pos: 2 }),
    } as never;

    const event = {
      dataTransfer: { files: [] },
      clientX: 0,
      clientY: 0,
      preventDefault: vi.fn(),
    } as unknown as DragEvent;

    const handled = handleImageDrop(view, event, true, uploadFn);
    expect(handled).toBe(false);
  });

  it("skips upload when validation fails", () => {
    const plugin = UploadImagesPlugin({ imageClass: "test" });
    let state = createState(plugin);
    const view = {
      get state() {
        return state;
      },
      dispatch(tr: typeof state.tr) {
        state = state.apply(tr);
      },
    } as unknown as { state: EditorState; dispatch: (tr: EditorState["tr"]) => void };

    const onUpload = vi.fn();
    const uploadFn = createImageUpload({
      validateFn: () => false,
      onUpload,
    });

    const file = new File(["data"], "test.png", { type: "image/png" });
    uploadFn(file, view as never, 1);
    expect(onUpload).not.toHaveBeenCalled();
  });
});
