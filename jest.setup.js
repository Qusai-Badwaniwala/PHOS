import "@testing-library/jest-dom";
Object.defineProperty(window, "scrollTo", { value: jest.fn(), writable: true });
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});
if (!window.PointerEvent) window.PointerEvent = MouseEvent;
HTMLElement.prototype.scrollIntoView = jest.fn();
HTMLElement.prototype.hasPointerCapture = () => false;
HTMLElement.prototype.setPointerCapture = jest.fn();
HTMLElement.prototype.releasePointerCapture = jest.fn();
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
