import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});

// jsdom does not implement these browser APIs, which the editor's floating menus rely on.
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

if (!globalThis.matchMedia) {
  globalThis.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof globalThis.matchMedia;
}

if (!HTMLElement.prototype.scrollIntoView) {
  HTMLElement.prototype.scrollIntoView = () => {};
}

// ProseMirror measures text ranges to place the caret. jsdom has no layout, so report empty geometry.
const emptyRects = (): DOMRectList => [] as unknown as DOMRectList;
const emptyRect = (): DOMRect => new DOMRect(0, 0, 0, 0);

if (!Range.prototype.getClientRects) {
  Range.prototype.getClientRects = emptyRects;
}
if (!Range.prototype.getBoundingClientRect) {
  Range.prototype.getBoundingClientRect = emptyRect;
}
if (!Element.prototype.getClientRects) {
  Element.prototype.getClientRects = emptyRects;
}
if (!Element.prototype.getBoundingClientRect) {
  Element.prototype.getBoundingClientRect = emptyRect;
}
if (!document.elementFromPoint) {
  document.elementFromPoint = () => null;
}
