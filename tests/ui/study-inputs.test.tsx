import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NumberStepper } from "@/components/ui/number-stepper";
import { WeakPageSelector } from "@/components/shared/weak-page-selector";
import type { StudyPageDTO } from "@/types/dto";

/**
 * The two controls that decide what PHOS is told about a user's Hifz:
 * how much they can do in a day, and which pages did not go well.
 * Everything the Adaptive and Memory Engines conclude is downstream of
 * these two.
 */
describe("NumberStepper", () => {
  function Controlled({ initial = 30, ...rest }: { initial?: number } & Record<string, unknown>) {
    const [value, setValue] = React.useState(initial);
    return (
      <NumberStepper
        value={value}
        onChange={setValue}
        min={5}
        max={960}
        aria-label="Daily minutes"
        {...rest}
      />
    );
  }

  it("steps up and down by the given amount", async () => {
    const user = userEvent.setup();
    render(<Controlled step={5} />);

    const field = screen.getByLabelText("Daily minutes");

    await user.click(screen.getByLabelText("Increase Daily minutes"));
    expect(field).toHaveValue(35);

    await user.click(screen.getByLabelText("Decrease Daily minutes"));
    expect(field).toHaveValue(30);
  });

  it("cannot be pushed past its bounds", async () => {
    const user = userEvent.setup();
    render(<Controlled initial={5} />);

    // Disabled rather than silently clamping, so the limit is visible
    // before it is hit.
    expect(screen.getByLabelText("Decrease Daily minutes")).toBeDisabled();

    await user.click(screen.getByLabelText("Increase Daily minutes"));
    expect(screen.getByLabelText("Decrease Daily minutes")).toBeEnabled();
  });

  it("lets a value be retyped digit by digit without mangling it", async () => {
    const user = userEvent.setup();
    render(<Controlled initial={30} />);

    const field = screen.getByLabelText("Daily minutes");
    await user.clear(field);
    await user.type(field, "45");

    /*
     * The defect this locks down: clearing the field made `Number("")`
     * zero, which clamped straight up to `min`, so the box read "5"
     * before the user had typed anything. Typing "45" into it produced
     * 545 — a nine-hour daily study budget, silently within range and
     * therefore never questioned.
     */
    expect(field).toHaveValue(45);
  });

  it("clamps an out-of-range value once the user leaves the field", async () => {
    const user = userEvent.setup();
    render(<Controlled initial={30} />);

    const field = screen.getByLabelText("Daily minutes");
    await user.clear(field);
    await user.type(field, "9999");
    await user.tab();

    // A budget of 9999 minutes would silently produce a plan nobody
    // could complete. Clamped on blur rather than per keystroke, so
    // intermediate digits survive.
    expect(field).toHaveValue(960);
  });

  it("clamps a value typed below the minimum, once editing is done", async () => {
    const user = userEvent.setup();
    render(<Controlled initial={30} />);

    const field = screen.getByLabelText("Daily minutes");
    await user.clear(field);
    await user.type(field, "2");
    await user.tab();

    expect(field).toHaveValue(5);
  });

  it("keeps fractional steps clean rather than drifting", async () => {
    const user = userEvent.setup();

    function Fractional() {
      const [value, setValue] = React.useState(1);
      return (
        <NumberStepper
          value={value}
          onChange={setValue}
          min={0.5}
          max={20}
          step={0.5}
          aria-label="Pages per day"
        />
      );
    }

    render(<Fractional />);

    // Floating-point accumulation would eventually show the user
    // "1.5000000000000002" for half a page.
    await user.click(screen.getByLabelText("Increase Pages per day"));
    await user.click(screen.getByLabelText("Increase Pages per day"));
    await user.click(screen.getByLabelText("Decrease Pages per day"));

    expect(screen.getByLabelText("Pages per day")).toHaveValue(1.5);
  });

  it("reverts an emptied field to the last good value rather than zero", async () => {
    const user = userEvent.setup();
    render(<Controlled initial={45} />);

    const field = screen.getByLabelText("Daily minutes");
    await user.clear(field);
    // Empty while the user is still in the box — they may be about to
    // type. `Number("")` is 0, so committing it would read as "you have
    // no time to study today".
    expect(field).toHaveValue(null);

    await user.tab();
    expect(field).toHaveValue(45);
  });

  it("settles a half-typed value before stepping on from it", async () => {
    const user = userEvent.setup();
    render(<Controlled initial={30} />);

    const field = screen.getByLabelText("Daily minutes");
    await user.clear(field);
    await user.type(field, "4");
    await user.click(screen.getByLabelText("Increase Daily minutes"));

    // Pressing + first blurs the field, which clamps the half-typed 4
    // up to the minimum of 5; the step then moves on from there. The
    // point is that the user never ends up somewhere unreachable — 6 is
    // one step above a legal value, not 41 or an empty box.
    expect(field).toHaveValue(6);
  });
});

describe("WeakPageSelector", () => {
  const PAGES: StudyPageDTO[] = [
    { pageId: "p1", pageNumber: 50, surahs: [{ name: "Aal-Imran", arabicName: "آل عمران" }] },
    {
      pageId: "p2",
      pageNumber: 602,
      surahs: [
        { name: "Quraysh", arabicName: "قريش" },
        { name: "Al-Ma'un", arabicName: "الماعون" },
        { name: "Al-Kawthar", arabicName: "الكوثر" },
      ],
    },
  ];

  function Controlled({ disabled = false }: { disabled?: boolean }) {
    const [selected, setSelected] = React.useState<ReadonlySet<string>>(new Set());
    return (
      <WeakPageSelector
        pages={PAGES}
        selected={selected}
        disabled={disabled}
        onToggle={(pageId) =>
          setSelected((current) => {
            const next = new Set(current);
            if (next.has(pageId)) next.delete(pageId);
            else next.add(pageId);
            return next;
          })
        }
      />
    );
  }

  it("starts with nothing flagged, because a good session is the default", () => {
    render(<Controlled />);

    // The whole input model: pages default to a successful recall and
    // the user marks only the exceptions.
    for (const button of screen.getAllByRole("button")) {
      expect(button).toHaveAttribute("aria-pressed", "false");
    }
    expect(screen.queryByText(/marked\./)).not.toBeInTheDocument();
  });

  it("names a surah-dense page by its surahs and a normal page by its number", () => {
    render(<Controlled />);

    // "Page 602" is not something a memorizer can act on; nobody thinks
    // of that day as "two-thirds of page 602".
    expect(
      screen.getByRole("button", { name: "Page 602: Quraysh, Al-Ma'un, Al-Kawthar" }),
    ).toHaveTextContent("Quraysh · Al-Ma'un · Al-Kawthar");
    expect(screen.getByRole("button", { name: "Page 50" })).toHaveTextContent("50");
  });

  it("toggles a page on and off", async () => {
    const user = userEvent.setup();
    render(<Controlled />);

    const page = screen.getByRole("button", { name: "Page 50" });

    await user.click(page);
    expect(screen.getByRole("button", { name: "Page 50, marked as shaky" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Page 50, marked as shaky" }));
    expect(screen.getByRole("button", { name: "Page 50" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("says what flagging will do, in the right number", async () => {
    const user = userEvent.setup();
    render(<Controlled />);

    await user.click(screen.getByRole("button", { name: "Page 50" }));
    expect(screen.getByText(/1 page marked\./)).toBeInTheDocument();
    expect(screen.getByText(/It will be scheduled again sooner/)).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Page 602: Quraysh, Al-Ma'un, Al-Kawthar" }),
    );
    expect(screen.getByText(/2 pages marked\./)).toBeInTheDocument();
    expect(screen.getByText(/They will be scheduled again sooner/)).toBeInTheDocument();
  });

  it("cannot be changed while the session is being submitted", async () => {
    const user = userEvent.setup();
    render(<Controlled disabled />);

    const page = screen.getByRole("button", { name: "Page 50" });
    expect(page).toBeDisabled();

    await user.click(page);
    expect(page).toHaveAttribute("aria-pressed", "false");
  });

  it("renders nothing at all when there are no pages to flag", () => {
    const { container } = render(
      <WeakPageSelector pages={[]} selected={new Set()} onToggle={() => undefined} />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
