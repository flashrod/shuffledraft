import { test, expect } from "@playwright/test";

test.use({ launchOptions: { headless: true } });

test("solo vs bots: draft → lineup → vote → results", async ({ page }) => {
  // Homepage
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Shuffle Draft/ })).toBeVisible();

  // Play vs bots
  await page.getByRole("button", { name: /Play vs bots/ }).click();

  // Lobby: ready up, start draft
  await page.getByRole("button", { name: /I'm ready/ }).click();
  await page.getByRole("button", { name: /Start draft/ }).click();

  // Draft 11 rounds
  for (let round = 1; round <= 11; round++) {
    // Wait for the set to load
    await expect(page.getByText(/Round \d+ \/ 11/)).toBeVisible();
    // Pick the first player in the set
    const firstCard = page.locator(".player-card").first();
    await expect(firstCard).toBeVisible();
    await firstCard.click();

    // If it's not the last round, wait for bots to auto-pick and rotate
    if (round < 11) {
      await expect(page.getByText(/Round \d+ \/ 11/)).not.toHaveText(`Round ${round} / 11`);
    }
  }

  // After the final pick, wait for bots to finish and lineup phase to begin
  await expect(page.getByRole("heading", { name: /Arrange your XI/ })).toBeVisible({ timeout: 15000 });

  // Select a formation
  await page.getByText("Choose formation", { exact: false }).first().click();
  await page.getByRole("option", { name: /4-3-3/ }).click();

  // Auto-arrange
  await page.getByRole("button", { name: /Auto-arrange/ }).click();

  // Lock in
  await page.getByRole("button", { name: /Lock in XI/ }).click();

  // Wait for voting
  await expect(page.getByRole("heading", { name: /Vote/ })).toBeVisible();

  // Vote for another team (first opponent card)
  const firstOpponent = page.locator('[role="button"]').filter({ hasText: /Tap to vote/ }).first();
  if ((await firstOpponent.count()) > 0) {
    await firstOpponent.click();
  }

  // Voting ends → results (single human vote tallies immediately)
  await expect(page.getByRole("heading", { name: /Results/ })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/Copy squads/)).toBeVisible();
});
