import { test, expect } from "@playwright/test";

// Rewritten for the rewired app (Phase 6): every assertion targets copy
// and routes that exist. Wallet-signed writes are rehearsed live with a
// funded session per ANCHOR.md — not faked here. Network-independent
// assertions only (no RPC reliance), so this stays green offline.

const BASE = "http://localhost:3000";

test.describe("Public site", () => {
  test("landing states the thesis + links", async ({ page }) => {
    await page.goto(`${BASE}/`);
    await expect(page.getByText("Open credit evidence for people")).toBeVisible();
    await expect(page.getByText("Attester-signed evidence")).toBeVisible();
    await expect(page.getByRole("link", { name: /how it works/i }).first()).toBeVisible();
  });

  test("how-it-works tells the honest lifecycle", async ({ page }) => {
    await page.goto(`${BASE}/how-it-works`);
    await expect(page.getByText("How Vouchain Works")).toBeVisible();
    await expect(page.getByText("Repay in Full, Grow the Record")).toBeVisible();
    await expect(page.getByText(/never fakes|sealed/i).first()).toBeVisible();
  });

  test("transparency lists deployed contracts", async ({ page }) => {
    await page.goto(`${BASE}/transparency`);
    await expect(page.getByText("Transparency & Deployment Status")).toBeVisible();
    await expect(page.getByText("NATIVE TESTNET MON")).toBeVisible();
    await expect(page.getByText(/0x84a84cfe2fe62499ba0fdf9cf49f617865f4152d/i)).toBeVisible();
  });

  test("explorer rejects bad input without RPC", async ({ page }) => {
    await page.goto(`${BASE}/explorer`);
    await expect(page.getByText("Look up any attestation.")).toBeVisible();
    await page.getByPlaceholder(/attestation id/i).fill("abc");
    await page.getByRole("button", { name: /look up/i }).click();
    await expect(page.getByText(/non-negative attestation id/i)).toBeVisible();
  });

  test("explorer deep link prefills from ?id=", async ({ page }) => {
    await page.goto(`${BASE}/explorer?id=1`);
    await expect(page.getByPlaceholder(/attestation id/i)).toHaveValue("1");
  });
});

test.describe("Auth gates", () => {
  test("gated routes bounce to login when signed out", async ({ page }) => {
    await page.goto(`${BASE}/app/home`);
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: "Sign in to Vouchain" })).toBeVisible();
  });

  test("login offers passkey/phone", async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await expect(page.getByRole("button", { name: /passkey/i })).toBeVisible();
  });
});
