import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { staticServer } from "./staticServer";

test.beforeEach(async ({ page }) => {
  await page.route("**/local-setup.json", (route) =>
    route.fulfill({ status: 404, body: "" }),
  );
});

test("shortcuts speak immediately while sentence negation stays silent", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const log: string[] = [];
    Object.assign(window, { speechLog: log });
    Object.defineProperty(window, "speechSynthesis", {
      value: {
        getVoices: () => [],
        cancel: () => {},
        speak: (u: { text: string }) => log.push(u.text),
        addEventListener: () => {},
        removeEventListener: () => {},
      },
    });
    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      value: class {
        text: string;
        constructor(text: string) {
          this.text = text;
        }
      },
    });
  });
  await page.goto("./");
  await page.getByRole("button", { name: "Yes", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { speechLog: string[] }).speechLog,
      ),
    )
    .toEqual(["Yes"]);
  await page.getByRole("button", { name: "No", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { speechLog: string[] }).speechLog,
      ),
    )
    .toEqual(["Yes", "No"]);
  await page.getByRole("button", { name: "Not", exact: true }).click();
  await expect(page.getByTestId("message")).toHaveText("Not: No");
  expect(
    await page.evaluate(
      () => (window as unknown as { speechLog: string[] }).speechLog,
    ),
  ).toEqual(["Yes", "No"]);
  await page.getByRole("button", { name: "Quick words", exact: true }).click();
  await page.getByRole("button", { name: /Wrong/ }).click();
  await expect(page.getByTestId("message")).toHaveText(
    "That’s not what I meant.",
  );
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { speechLog: string[] }).speechLog,
      ),
    )
    .toEqual(["Yes", "No", "That’s not what I meant."]);
  await page.getByRole("button", { name: "Message", exact: true }).click();
  await page.getByRole("button", { name: "Speak", exact: true }).click();
  await page.getByRole("button", { name: "Repeat", exact: true }).click();
  await page
    .getByRole("button", { name: "Stop speaking", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Stopped.");
  expect(
    await page.evaluate(
      () => (window as unknown as { speechLog: string[] }).speechLog,
    ),
  ).toHaveLength(5);
});

test("build, negate, speak, undo, clear and recover at phone size", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByRole("button", { name: "I / me", exact: true }).click();
  await page.getByRole("button", { name: "Want", exact: true }).click();
  await page.getByRole("button", { name: "phone", exact: true }).click();
  await expect(page.getByTestId("message")).toHaveText("I want my phone.");
  await page.getByRole("button", { name: "1 Who", exact: true }).click();
  await page.getByRole("button", { name: "Not", exact: true }).click();
  await expect(page.getByTestId("message")).toHaveText(
    "I don’t want my phone.",
  );
  await page.getByRole("button", { name: "Message", exact: true }).click();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByTestId("message")).toHaveText("I want my phone.");
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await page
    .getByRole("button", { name: "Restore message", exact: true })
    .click();
  await expect(page.getByTestId("message")).toHaveText("I want my phone.");
  await page.getByRole("button", { name: "No", exact: true }).click();
  await expect(page.getByTestId("message")).toHaveText("No");
});

test("categories and skipped steps", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Categories", exact: true }).click();
  await page.getByRole("button", { name: "Topics", exact: true }).click();
  await page
    .getByRole("button", { name: "something that happened", exact: true })
    .click();
  await expect(page.getByTestId("message")).toHaveText(
    "something that happened",
  );
  await page.getByRole("button", { name: "Categories", exact: true }).click();
  await page
    .getByRole("button", { name: "Back to categories", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Type / ABC", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole("textbox")).toHaveCount(0);
});

test("personal word persists and backup can be previewed and restored", async ({
  page,
}) => {
  await page.goto("./");
  await page
    .getByRole("button", { name: "Edit & settings", exact: true })
    .click();
  await page.getByLabel("Word label", { exact: true }).fill("My blue mug");
  await page.getByRole("button", { name: "Save word", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Saved on this device" }),
  ).toBeVisible();
  const downloaded = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download backup", exact: true })
    .click();
  const backup = await downloaded;
  const path = await backup.path();
  expect(path).toBeTruthy();
  await page.reload();
  await page
    .getByRole("button", { name: "Edit & settings", exact: true })
    .click();
  await expect(page.getByLabel("Choose a word to edit")).toContainText(
    "My blue mug",
  );
  await page.getByLabel("Import backup file").setInputFiles(path!);
  await expect(page.getByText("Backup ready to review")).toBeVisible();
  await page.getByRole("button", { name: "Merge backup", exact: true }).click();
  await expect(page.getByText("Backup imported.")).toBeVisible();
});

test("photos, favorites, defensive import and settings accessibility", async ({
  page,
}) => {
  await page.goto("./");
  await page
    .getByRole("button", { name: "Edit & settings", exact: true })
    .click();
  await page.getByLabel("Word label", { exact: true }).fill("<b>My photo</b>");
  await page
    .getByLabel("Personal photo (optional)")
    .setInputFiles("public/icons/icon-512.png");
  await expect(page.getByAltText("Selected personal photo")).toBeVisible();
  await page.getByRole("button", { name: "Save word", exact: true }).click();
  await page.getByLabel("Complete phrase").fill("This is my favorite.");
  await page
    .getByRole("button", { name: "Save favorite", exact: true })
    .click();
  await expect(
    page.getByText("Favorite saved.", { exact: true }),
  ).toBeVisible();
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);
  await page.getByLabel("Import backup file").setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":999}'),
  });
  await expect(page.getByRole("alert")).toContainText("Invalid backup");
  await expect(page.getByLabel("Choose a word to edit")).toContainText(
    "<b>My photo</b>",
  );
  await page
    .getByRole("button", { name: "Back to talking", exact: false })
    .click();
  await page.getByRole("button", { name: "Categories", exact: true }).click();
  await page.getByRole("button", { name: "Things", exact: true }).click();
  const photo = page.getByRole("button", {
    name: "<b>My photo</b>",
    exact: true,
  });
  while (!(await photo.isVisible()))
    await page.getByRole("button", { name: "More words", exact: true }).click();
  await expect(photo.locator("img")).toHaveJSProperty("naturalWidth", 512);
  await photo.click();
  await expect(page.getByTestId("message")).toHaveText("<b>My photo</b>");
  await expect(page.getByTestId("message").locator("b")).toHaveCount(0);
  await page.getByRole("button", { name: "Favorites", exact: true }).click();
  await page
    .getByRole("button", { name: "This is my favorite.", exact: true })
    .click();
  await expect(page.getByTestId("message")).toHaveText("This is my favorite.");
});

test("offline shell, manifest and correct scope", async ({
  page,
  context,
  browserName,
}) => {
  const server = await staticServer();
  try {
    await page.goto(server.url);
    await expect(
      page.getByText("Ready for offline use", { exact: true }),
    ).toBeVisible({ timeout: 20000 });
    const manifest = await page.evaluate(
      async () =>
        await (
          await fetch(
            document.querySelector<HTMLLinkElement>('link[rel="manifest"]')!
              .href,
          )
        ).json(),
    );
    expect(manifest.scope).toBe(process.env.BASE_PATH || "/");
    expect(manifest.start_url).toBe(manifest.scope);
    // A partially evicted cache must be repaired while online before claiming ready.
    await page.evaluate(async () => {
      for (const key of await caches.keys()) {
        const cache = await caches.open(key);
        for (const request of await cache.keys())
          if (request.url.endsWith(".css")) await cache.delete(request);
      }
    });
    await page.reload();
    await expect(
      page.getByText("Ready for offline use", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Yes", exact: true }).waitFor();
    await server.stop();
    if (browserName === "chromium") await context.setOffline(true);
    await page.reload();
    await page.getByRole("button", { name: "Yes", exact: true }).click();
    await expect(page.getByTestId("message")).toHaveText("Yes");
  } finally {
    await server.stop();
  }
});

test("landscape shortcuts stay reachable and enlarged keyboard focus is not covered", async ({
  page,
}) => {
  await page.goto("./");
  await page.setViewportSize({ width: 844, height: 390 });
  await page.getByRole("button", { name: "2 Action", exact: true }).click();
  await page.getByRole("button", { name: "Want", exact: true }).click();
  await page.getByRole("button", { name: "phone", exact: true }).click();
  const quick = page.getByRole("button", { name: "Quick words", exact: true });
  await expect(quick).toBeInViewport();
  await quick.click();
  await page.getByRole("button", { name: "Help", exact: true }).click();
  await expect(page.getByTestId("message")).toHaveText("Help");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => (document.documentElement.style.fontSize = "200%"));
  await page.getByRole("button", { name: "1 Who", exact: true }).click();
  await page.getByRole("button", { name: "I / me", exact: true }).focus();
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press("Tab");
    await expect
      .poll(() =>
        page.evaluate(() => {
          const el = document.activeElement!;
          const rect = el.getBoundingClientRect();
          const top = document.elementFromPoint(
            rect.left + rect.width / 2,
            rect.top + rect.height / 2,
          );
          return (
            rect.top >= 0 &&
            rect.bottom <= innerHeight &&
            !!top &&
            (el === top || el.contains(top))
          );
        }),
      )
      .toBe(true);
  }
});

test("updates wait for an explicit action with an empty message", async ({
  page,
}) => {
  const server = await staticServer();
  try {
    await page.goto(server.url);
    await expect(
      page.getByText("Ready for offline use", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Update & reopen", exact: true }),
    ).toHaveCount(0);
    await page.getByRole("button", { name: "I / me", exact: true }).click();
    await page.getByRole("button", { name: "Want", exact: true }).click();
    await page.getByRole("button", { name: "Message", exact: true }).click();
    server.revise();
    await page.evaluate(async () => {
      await (await navigator.serviceWorker.getRegistration())?.update();
    });
    const update = page.getByRole("button", {
      name: "Update & reopen",
      exact: true,
    });
    await expect(update).toBeVisible();
    await expect(update).toBeDisabled();
    await expect(page.getByTestId("message")).toHaveText("I want.");
    await page.getByRole("button", { name: "Message", exact: true }).click();
    await page.getByRole("button", { name: "Clear", exact: true }).click();
    await update.click();
    await expect(
      page.getByRole("button", { name: "Restore message", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByText("Ready for offline use", { exact: true }),
    ).toBeVisible();
    await expect(update).toHaveCount(0);
  } finally {
    await server.stop();
  }
});

test("no serious accessibility violations, horizontal overflow or undersized buttons", async ({
  page,
}) => {
  await page.goto("./");
  await expect(
    page.getByRole("button", { name: "I / me", exact: true }),
  ).toBeVisible();
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
  const smallButtons = await page
    .locator("button:visible")
    .evaluateAll((buttons) =>
      buttons
        .filter(
          (b) =>
            b.getBoundingClientRect().width < 55 ||
            b.getBoundingClientRect().height < 55,
        )
        .map((b) => b.textContent),
    );
  expect(smallButtons).toEqual([]);
  for (const size of [
    { width: 320, height: 568 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(size);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => (document.documentElement.style.fontSize = "200%"));
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
