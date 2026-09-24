import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";

test("custom categories persist, rename word references and travel in backups", async ({
  page,
}) => {
  await page.goto("./");
  await page
    .getByRole("button", { name: "Edit & settings", exact: true })
    .click();
  await page.getByLabel("New category name", { exact: true }).fill("Music");
  await page.getByRole("button", { name: "Add category", exact: true }).click();
  await page.getByLabel("Word label", { exact: true }).fill("piano");
  await page.getByLabel("Word category", { exact: true }).selectOption("Music");
  await page.getByRole("button", { name: "Save word", exact: true }).click();
  await page
    .getByLabel("Choose a category to edit", { exact: true })
    .selectOption("Music");
  await expect(
    page.getByRole("button", { name: "Remove category", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("Category name", { exact: true }).fill("Songs");
  await page
    .getByRole("button", { name: "Rename category", exact: true })
    .click();
  await expect(page.getByLabel("Choose a word to edit")).toContainText(
    "piano · Songs",
  );
  await page.getByLabel("New category name", { exact: true }).fill("songs");
  await page.getByRole("button", { name: "Add category", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("unique");
  await page
    .getByLabel("New category name", { exact: true })
    .fill("Empty category");
  await page.getByRole("button", { name: "Add category", exact: true }).click();
  await page
    .getByLabel("Choose a category to edit", { exact: true })
    .selectOption("Empty category");
  await page
    .getByRole("button", { name: "Remove category", exact: true })
    .click();
  await expect(
    page.getByLabel("Word category").locator("option"),
  ).not.toContainText(["Empty category"]);
  await expect(
    page.getByText("Saved on this device.", { exact: true }),
  ).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download backup", exact: true })
    .click();
  const download = await downloadPromise;
  const backup = await readFile((await download.path())!, "utf8");
  expect(JSON.parse(backup).version).toBe(2);
  expect(JSON.parse(backup).data.customCategories).toEqual(["Songs"]);
  await page.reload();
  await page
    .getByRole("button", { name: "Edit & settings", exact: true })
    .click();
  await expect(page.getByLabel("Word category")).toContainText("Songs");
  await page.getByLabel("Import backup file").setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(backup),
  });
  await page.getByRole("button", { name: "Merge backup", exact: true }).click();
  await expect(
    page.getByLabel("Word category").locator("option", { hasText: "Songs" }),
  ).toHaveCount(1);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page
    .getByRole("button", { name: "Back to talking", exact: true })
    .click();
  await page.getByRole("button", { name: "Categories", exact: true }).click();
  while (
    !(await page.getByRole("button", { name: "Songs", exact: true }).count())
  )
    await page.getByRole("button", { name: "More words", exact: true }).click();
  await page.getByRole("button", { name: "Songs", exact: true }).click();
  await page.getByRole("button", { name: "piano", exact: true }).click();
  await expect(page.getByTestId("message")).toHaveText("piano");
});

test("OK speaks immediately and navigation stays centered above the dock", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const spoken: string[] = [];
    Object.assign(window, { spoken });
    Object.defineProperty(window, "speechSynthesis", {
      value: {
        cancel() {},
        speak(u: { text: string }) {
          spoken.push(u.text);
        },
        getVoices: () => [],
        addEventListener() {},
        removeEventListener() {},
      },
    });
    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      value: class {
        constructor(public text: string) {}
      },
    });
  });
  await page.goto("./");
  const dock = page.getByRole("navigation", { name: "Quick communication" });
  await expect(dock.getByRole("button")).toHaveText([
    "Yes",
    "No",
    "OK",
    "Quick words",
  ]);
  await dock.getByRole("button", { name: "OK", exact: true }).click();
  await expect(page.getByTestId("message")).toHaveText("OK");
  expect(
    await page.evaluate(
      () => (window as unknown as { spoken: string[] }).spoken,
    ),
  ).toEqual(["OK"]);
  await page.getByRole("button", { name: "Favorites", exact: true }).click();
  const favorite = page.locator(".phrase-list button").first();
  const phrase = await favorite.textContent();
  await favorite.click();
  await expect(page.getByTestId("message")).toHaveText(phrase!);
  expect(
    await page.evaluate(
      () => (window as unknown as { spoken: string[] }).spoken,
    ),
  ).toEqual(["OK", phrase]);
  await page.getByRole("button", { name: "1 Who", exact: true }).click();
  await page.getByRole("button", { name: "Not", exact: true }).click();
  expect(
    await page.evaluate(
      () => (window as unknown as { spoken: string[] }).spoken,
    ),
  ).toEqual(["OK", phrase]);
  const not = await page
    .getByRole("button", { name: "Not", exact: true })
    .boundingBox();
  const subject = await page
    .getByRole("button", { name: "I / me", exact: true })
    .boundingBox();
  expect(not!.y + not!.height).toBeLessThanOrEqual(subject!.y);
  expect(
    Math.abs(not!.x + not!.width / 2 - page.viewportSize()!.width / 2),
  ).toBeLessThan(3);
  for (const name of [
    "Skip who",
    "Skip action",
    "Skip what / where",
    "New thought",
  ]) {
    const button = page.getByRole("button", { name, exact: true });
    await expect(button).toBeInViewport({ ratio: 1 });
    const box = (await button.boundingBox())!;
    const bottom = (await dock.boundingBox())!;
    expect(
      Math.abs(box.x + box.width / 2 - bottom.x - bottom.width / 2),
    ).toBeLessThan(3);
    expect(bottom.y - box.y - box.height).toBeGreaterThanOrEqual(0);
    expect(bottom.y - box.y - box.height).toBeLessThan(20);
    await button.click();
  }
  await expect(
    page.getByRole("button", { name: "Undo", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Clear", exact: true }),
  ).toHaveCount(0);
});

test("word choices use more space and retain access to every word", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Categories", exact: true }).click();
  await page.getByRole("button", { name: "Things", exact: true }).click();
  await page.setViewportSize({ width: 320, height: 568 });
  await expect
    .poll(() => page.locator(".word-grid button").count())
    .toBeGreaterThan(0);
  const small = await page.locator(".word-grid button").count();
  await page.setViewportSize({ width: 820, height: 1000 });
  await expect
    .poll(() => page.locator(".word-grid button").count())
    .toBeGreaterThan(small);
  expect(await page.locator(".word-grid button").count()).toBeGreaterThan(4);
  const columns = await page
    .locator(".word-grid")
    .evaluate(
      (el) => getComputedStyle(el).gridTemplateColumns.split(" ").length,
    );
  expect(columns).toBeGreaterThan(2);
  await page.setViewportSize({ width: 320, height: 568 });
  const seen = new Set<string>();
  for (let i = 0; i < 50; i++) {
    for (const label of await page
      .locator(".word-grid button")
      .allTextContents())
      seen.add(label.trim());
    const more = page.getByRole("button", { name: "More words", exact: true });
    if (!(await more.count()) || (await more.isDisabled())) break;
    await more.click();
  }
  expect(seen.size).toBeGreaterThan(4);
});

test("selected action choices fit the small portrait screen", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("./");
  await page.getByRole("button", { name: "I / me", exact: true }).click();
  await page.getByRole("button", { name: "Want", exact: true }).click();
  await expect
    .poll(() =>
      page.locator("main").evaluate((el) => el.scrollHeight - el.clientHeight),
    )
    .toBeLessThanOrEqual(1);
  await expect(
    page.getByRole("button", { name: "More words", exact: true }),
  ).toBeInViewport({ ratio: 1 });
});
