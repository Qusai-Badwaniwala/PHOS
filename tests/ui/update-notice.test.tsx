import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { ServiceWorkerRegistration } from "@/components/layout/service-worker-registration";
import { fetchActiveSession } from "@/lib/api/activeSession";

jest.mock("next/navigation", () => ({ usePathname: () => "/dashboard" }));
jest.mock("@/lib/api/activeSession", () => ({ fetchActiveSession: jest.fn() }));

let registration: {
  waiting: null | { postMessage: jest.Mock };
  update: jest.Mock;
  addEventListener: jest.Mock;
};
let waitingWorker: { postMessage: jest.Mock };
const readyState = Object.getOwnPropertyDescriptor(document, "readyState");
const originalWorker = Object.getOwnPropertyDescriptor(navigator, "serviceWorker");

beforeEach(() => {
  jest.useFakeTimers();
  jest.replaceProperty(process, "env", { ...process.env, NODE_ENV: "production" });
  Object.defineProperty(document, "readyState", { configurable: true, value: "complete" });
  waitingWorker = { postMessage: jest.fn() };
  registration = {
    waiting: waitingWorker,
    update: jest.fn().mockResolvedValue(undefined),
    addEventListener: jest.fn(),
  };
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: {
      register: jest.fn().mockResolvedValue(registration),
      controller: {},
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    },
  });
  jest.mocked(fetchActiveSession).mockResolvedValue(null);
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
  if (readyState) Object.defineProperty(document, "readyState", readyState);
  else Reflect.deleteProperty(document, "readyState");
  if (originalWorker) Object.defineProperty(navigator, "serviceWorker", originalWorker);
  else Reflect.deleteProperty(navigator, "serviceWorker");
});

it("checks again while open and redisplays a deferred update on returning", async () => {
  const { unmount } = render(<ServiceWorkerRegistration />);
  await act(async () => undefined);
  expect(screen.getByText("A new PHOS is ready")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Later" }));
  expect(screen.queryByText("A new PHOS is ready")).not.toBeInTheDocument();
  await act(async () => {
    document.dispatchEvent(new Event("visibilitychange"));
  });
  expect(screen.getByText("A new PHOS is ready")).toBeVisible();
  await act(async () => {
    jest.advanceTimersByTime(10 * 60 * 1000);
  });
  expect(registration.update).toHaveBeenCalledTimes(2);
  unmount();
  jest.advanceTimersByTime(10 * 60 * 1000);
  expect(registration.update).toHaveBeenCalledTimes(2);
});

it("checks the actual open study before allowing activation", async () => {
  jest
    .mocked(fetchActiveSession)
    .mockResolvedValue({ sessionType: "Sabaq" } as NonNullable<
      Awaited<ReturnType<typeof fetchActiveSession>>
    >);
  render(<ServiceWorkerRegistration />);
  await act(async () => undefined);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Apply update" }));
  });
  expect(waitingWorker.postMessage).not.toHaveBeenCalled();
  expect(screen.getByRole("link", { name: "Resume study" })).toHaveAttribute("href", "/session");
  expect(screen.getByText(/Finish your open study/)).toBeVisible();
});

it("activates only after Apply update when there is no open study", async () => {
  render(<ServiceWorkerRegistration />);
  await act(async () => undefined);
  expect(waitingWorker.postMessage).not.toHaveBeenCalled();
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Apply update" }));
  });
  expect(waitingWorker.postMessage).toHaveBeenCalledWith({ type: "PHOS_APPLY_UPDATE" });
  expect(screen.getByRole("button", { name: "Updating…" })).toBeDisabled();
});

it("does not report a replaced waiting release as an offline-install failure", async () => {
  render(<ServiceWorkerRegistration />);
  await act(async () => undefined);
  const worker = {
    state: "installing",
    postMessage: jest.fn(),
    addEventListener: jest.fn(),
  };
  Object.assign(registration, { installing: worker });
  const updateFound = registration.addEventListener.mock.calls.find(
    ([type]) => type === "updatefound",
  )![1];
  await act(async () => {
    updateFound();
  });
  const stateChanged = worker.addEventListener.mock.calls[0]![1];
  await act(async () => {
    worker.state = "installed";
    stateChanged();
  });
  // A later release makes the old waiting worker redundant; this is normal.
  await act(async () => {
    worker.state = "redundant";
    stateChanged();
  });
  fireEvent.click(screen.getByRole("button", { name: "Later" }));
  expect(screen.queryByText("Offline setup needs another try")).not.toBeInTheDocument();
});

it("offers retry when a new worker actually fails before installation", async () => {
  registration.waiting = null;
  render(<ServiceWorkerRegistration />);
  await act(async () => undefined);
  const worker = { state: "installing", addEventListener: jest.fn() };
  Object.assign(registration, { installing: worker });
  const updateFound = registration.addEventListener.mock.calls.find(
    ([type]) => type === "updatefound",
  )![1];
  await act(async () => {
    updateFound();
  });
  Object.assign(registration, { installing: null });
  await act(async () => {
    worker.state = "redundant";
    worker.addEventListener.mock.calls[0]![1]();
  });
  expect(screen.getByText("Offline setup needs another try")).toBeVisible();
  expect(screen.getByRole("button", { name: "Retry offline setup" })).toBeEnabled();
});
