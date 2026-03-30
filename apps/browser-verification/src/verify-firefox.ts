import { Builder } from "selenium-webdriver";
import firefox from "selenium-webdriver/firefox";

function log(msg: string) {
  console.log(`[verifyFirefox] ${new Date().toISOString()} — ${msg}`);
}

async function withTimeout<T>(promise: Promise<T>, ms: number) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
    )
  ]);
}

export async function verifyFirefox(headless = true) {
  const options = new firefox.Options();

  if (headless) {
    options.addArguments(
      "-headless",
      "--width=1280",
      "--height=800"
    );
  }

  if (process.env.FIREFOX_BIN) {
    options.setBinary(process.env.FIREFOX_BIN);
  }

  log("Building Firefox driver");
  const driver = await new Builder()
    .forBrowser("firefox")
    .setFirefoxOptions(options)
    .build();

  try {
    log("Navigating to example.com");
    await withTimeout(driver.get("https://example.com"), 15000);

    const title = await driver.getTitle();
    log(`Firefox page title: ${title}`);

    if (title !== "Example Domain") {
      throw new Error(`Unexpected title: ${title}`);
    }

    log("Firefox verification succeeded");
  } finally {
    log("Quitting driver");
    await driver.quit();
  }
}