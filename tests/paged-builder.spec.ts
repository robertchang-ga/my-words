import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test.beforeEach(async ({ page }) => {
  await page.route("**/local-setup.json", (route) =>
    route.fulfill({ status: 404, body: "" }),
  );
});

async function visibleDock(page: Page) {
  const dock = page.getByRole("navigation", { name: "Quick communication" });
  for (const name of ["Yes", "No", "Quick words"])
    await expect(
      dock.getByRole("button", { name, exact: true }),
    ).toBeInViewport({ ratio: 1 });
}

test("separate choice pages, silent first-page Not and final message controls", async ({
  page,
}) => {
  await page.goto("./");
  await expect(
    page.getByRole("heading", { name: "Who", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Want", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Speak", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Not", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Not", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "I / me", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Action", exact: true }),
  ).toBeFocused();
  await expect(
    page.getByRole("button", { name: "I / me", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Want", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "What / where", exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: "phone", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Message", exact: true }),
  ).toBeFocused();
  await expect(page.getByTestId("message")).toHaveText(
    "I don’t want my phone.",
  );
  for (const name of ["Speak", "Repeat", "Stop speaking", "Undo", "Clear"])
    await expect(
      page.getByRole("button", { name, exact: true }),
    ).toBeInViewport({ ratio: 1 });
  await visibleDock(page);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
});

test("steps can be skipped and revisited without losing selected words", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Skip who", exact: true }).click();
  await page.getByRole("button", { name: "Skip action", exact: true }).click();
  await page.getByRole("button", { name: "that", exact: true }).click();
  await expect(page.getByTestId("message")).toHaveText("that");
  await page.getByRole("button", { name: "1 Who", exact: true }).click();
  await page.getByRole("button", { name: "I / me", exact: true }).click();
  await page.getByRole("button", { name: "Want", exact: true }).click();
  await page.getByRole("button", { name: "Message", exact: true }).click();
  await expect(page.getByTestId("message")).toHaveText("I want that.");
});

test("phone pages fit without document scrolling and shortcuts remain in settings", async ({
  page,
}) => {
  await page.goto("./");
  for (const size of [
    { width: 390, height: 844 },
    { width: 320, height: 568 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(size);
    for (const name of ["1 Who", "2 Action", "3 What / where", "Message"]) {
      await page.getByRole("button", { name, exact: true }).click();
      await visibleDock(page);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollHeight <= innerHeight + 1,
        ),
      ).toBe(true);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      if (size.width <= 390) {
        const layout = await page.locator("main").evaluate((el) => ({
          scroll: el.scrollHeight,
          height: el.clientHeight,
          sections: Array.from(
            document.querySelectorAll(
              ".app-header, .message-panel, main > *, .quick-bar",
            ),
          ).map((node) => ({
            text: node.textContent,
            height: node.getBoundingClientRect().height,
          })),
        }));
        expect(
          layout.scroll,
          JSON.stringify({ size, name, layout }),
        ).toBeLessThanOrEqual(layout.height + 1);
      }
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: "Edit & settings", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Download backup", exact: true })
    .scrollIntoViewIfNeeded();
  await visibleDock(page);
  await page.getByRole("button", { name: "Quick words", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("button", { name: "I have a question.", exact: true })
    .click();
  await expect(page.getByTestId("message")).toHaveText("I have a question.");
  await expect(
    page.getByRole("heading", { name: "Edit & settings", exact: true }),
  ).toBeVisible();
});

test("Other selects a saved person or someone else without typing", async ({
  page,
}) => {
  await page.goto("./");
  await page
    .getByRole("button", { name: "Edit & settings", exact: true })
    .click();
  await page.getByLabel("Word label", { exact: true }).fill("Alex");
  await page
    .getByLabel("Word category", { exact: true })
    .selectOption("People");
  await page.getByRole("button", { name: "Save word", exact: true }).click();
  await page
    .getByRole("button", { name: "Back to talking", exact: true })
    .click();
  await page.getByRole("button", { name: "Other", exact: true }).click();
  await page.getByRole("button", { name: "Alex", exact: true }).click();
  await page.getByRole("button", { name: "Feel", exact: true }).click();
  await page.getByRole("button", { name: "tired", exact: true }).click();
  await expect(page.getByTestId("message")).toHaveText("Alex feels tired.");
  await page.getByRole("button", { name: "1 Who", exact: true }).click();
  await page.getByRole("button", { name: "Other", exact: true }).click();
  await page.getByRole("button", { name: "More words", exact: true }).click();
  await page.getByRole("button", { name: "Someone else", exact: true }).click();
  await expect(page.getByTestId("message")).toHaveText(
    "Someone else feels tired.",
  );
  await expect(page.getByRole("textbox")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Type / ABC", exact: true }),
  ).toHaveCount(0);
});
