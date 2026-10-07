import { test, expect } from "@playwright/test";

test.describe("Vouchain End-to-End Demo Loop & Rehearsal", () => {
  test("Golden Path: Attestation -> Record -> Consent -> Underwriting -> Loan", async ({ page }) => {
    // 1. Visit Landing Page
    await page.goto("http://localhost:3000/");
    await expect(page.getByText("Vouchain")).toBeVisible();
    await expect(page.getByText("Attester-signed evidence")).toBeVisible();

    // 2. View My Record
    await page.goto("http://localhost:3000/record");
    await expect(page.getByText("My Credit Record")).toBeVisible();
    await expect(page.getByText("765")).toBeVisible(); // Open score
    await expect(page.getByText("SwiftDeliver Payout")).toBeVisible();

    // 3. Initiate Consent Flow
    await page.goto("http://localhost:3000/consent");
    await expect(page.getByText("Grant Access to Your Record")).toBeVisible();
    await expect(page.getByText("Step 1 of 4")).toBeVisible();

    // Select lender & proceed
    await page.getByText("MicroLend Finance").click();
    await page.getByRole("button", { name: "Continue to Scope" }).click();
    await expect(page.getByText("Step 2 of 4")).toBeVisible();

    // 4. Lender Console
    await page.goto("http://localhost:3000/lender");
    await expect(page.getByText("Lender Underwriting Console")).toBeVisible();
    await expect(page.getByText("PROOFGATE PASSED")).toBeVisible();
    await expect(page.getByText("Originate Loan")).toBeVisible();

    // 5. Loan Screen
    await page.goto("http://localhost:3000/loan");
    await expect(page.getByText("Credit Ladder & Loan Manager")).toBeVisible();
    await expect(page.getByText("Automatic Repayment Waterfall")).toBeVisible();

    // 6. Attester Explorer
    await page.goto("http://localhost:3000/explorer");
    await expect(page.getByText("Public Attester Directory")).toBeVisible();
    await expect(page.getByText("SwiftDeliver Pilot Platform")).toBeVisible();
  });

  test("Accountability & Challenge Path: Plant Fraud -> Open Challenge -> Live Slash", async ({ page }) => {
    // 1. Challenge Console
    await page.goto("http://localhost:3000/challenge");
    await expect(page.getByText("Attestation Challenge Console")).toBeVisible();
    await expect(page.getByText("Flagged Commitment")).toBeVisible();

    // 2. Click Open Challenge
    await page.getByRole("button", { name: "Open Challenge & Post Bond" }).click();
    await expect(page.getByText("Post 1.0 MON Challenger Bond")).toBeVisible();

    // 3. Simulate Arbiter Resolution & Live Slash
    await page.getByRole("button", { name: "Confirm & Submit Challenge" }).click();
    await expect(page.getByText("Arbiter Verdict: CHALLENGE UPHELD")).toBeVisible();
    await expect(page.getByText("Attester Bond Slashed")).toBeVisible();
  });
});
