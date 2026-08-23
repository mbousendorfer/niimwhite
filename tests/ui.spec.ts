import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("inserts, selects and restores an object through history", async ({ page }) => {
  const undo = page.getByRole("button", { name: "Undo" });
  const redo = page.getByRole("button", { name: "Redo" });

  await page.getByRole("button", { name: "Text", exact: true }).click();
  await expect(page.getByRole("tab", { name: /Selection/ })).toBeEnabled();
  await expect(undo).toBeEnabled();

  await undo.click();
  await expect(redo).toBeEnabled();
  await redo.click();
  await expect(undo).toBeEnabled();
});

test("edits a text object through the structured property inspector", async ({ page }) => {
  await page.getByRole("button", { name: "Text", exact: true }).click();
  const inspector = page.getByRole("tabpanel", { name: /Selection/ });

  await expect(inspector.getByText("Text", { exact: true }).first()).toBeVisible();
  await expect(inspector.getByText("Transform", { exact: true })).toBeVisible();
  await expect(inspector.getByText("Content", { exact: true }).first()).toBeVisible();
  await expect(inspector.getByText("Appearance", { exact: true })).toBeVisible();
  await expect(inspector.getByText("Typography", { exact: true })).toBeVisible();

  const content = inspector.getByRole("textbox", { name: "Text", exact: true });
  await content.fill("Shipping 24");
  await expect(content).toHaveValue("Shipping 24");

  const fontSize = inspector.getByRole("spinbutton", { name: /Font size/ });
  await fontSize.fill("32");
  await expect(fontSize).toHaveValue("32");
  await expect(inspector.getByRole("button", { name: /Date \{dt\|YYYY-MM-DD\}/ })).toBeVisible();
});

test("opens the contextual inspector and its label settings", async ({ page }) => {
  const labelSettings = page.locator(".inspector-editor-trigger [data-dropdown-toggle]");
  await labelSettings.click();
  await expect(page.locator(".inspector-editor-trigger .dropdown-menu")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".inspector-editor-trigger .dropdown-menu")).toBeHidden();
  await expect(labelSettings).toBeFocused();
});

test("keeps advanced insertion popovers above the canvas", async ({ page }) => {
  await page.getByRole("button", { name: "Add icon", exact: true }).click();
  const iconPopover = page.locator('[data-slot="popover-content"]');
  await expect(iconPopover.getByPlaceholder("Search")).toBeVisible();
  await expect.poll(() => iconPopover.locator(".icons button").count()).toBeGreaterThan(100);

  const iconBounds = await iconPopover.boundingBox();
  expect(iconBounds).not.toBeNull();
  expect(iconBounds!.x).toBeGreaterThanOrEqual(0);
  expect(iconBounds!.x + iconBounds!.width).toBeLessThanOrEqual(1280);
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Add object", exact: true }).click();
  const objectPopover = page.locator('[data-slot="popover-content"]');
  await expect(objectPopover.getByText("Add object", { exact: true })).toBeVisible();
  await objectPopover.getByRole("button", { name: /Rectangle/ }).click();
  await expect(objectPopover).toBeHidden();
  await expect(page.getByRole("tab", { name: /Selection/ })).toBeEnabled();
});

test("persists canvas display settings", async ({ page }) => {
  await page.getByRole("button", { name: "Grid", exact: true }).click();
  await expect(page.getByText("Grid on", { exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("config"))).toContain('"gridEnabled":true');

  await page.reload();
  await expect(page.getByText("Grid on", { exact: true })).toBeVisible();
});

test("shows print preview and disconnected printing state", async ({ page }) => {
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  const preview = page.getByRole("dialog");
  await expect(preview.getByRole("heading", { name: "Print preview" })).toBeVisible();
  await expect(preview.getByText("Print settings", { exact: true })).toBeVisible();
  await expect(preview.getByRole("button", { name: "Printer is not connected" })).toBeDisabled();
  await preview.press("Escape");
  await expect(preview).toBeHidden();
});

test("uses the mobile inspector sheet without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect.poll(() => page.evaluate(() => document.body.scrollWidth)).toBe(390);

  await page.getByRole("button", { name: "Inspector" }).click();
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByRole("heading", { name: "Inspector" })).toBeVisible();
  await sheet.press("Escape");
  await expect(sheet).toBeHidden();
});

test("synchronizes locale direction for Arabic", async ({ page }) => {
  await page.evaluate(() => localStorage.setItem("locale", "ar"));
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
});
