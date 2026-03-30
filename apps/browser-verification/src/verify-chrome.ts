import { Builder } from "selenium-webdriver";
import chrome from "selenium-webdriver/chrome";

function log(msg: string) {
  console.log(`[verifyChrome] ${new Date().toISOString()} — ${msg}`);
}

async function withTimeout<T>(promise: Promise<T>, ms: number) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
    )
  ]);
}

export async function verifyChrome(headless = true) {
  const options = new chrome.Options();

  if (headless) {
    options.addArguments(
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--window-size=1280,800"
    );
  }

  if (process.env.CHROME_BIN) {
    options.setChromeBinaryPath(process.env.CHROME_BIN);
  }

  log("Building Chrome driver");
  const driver = await new Builder()
    .forBrowser("chrome")
    .setChromeOptions(options)
    .build();

  try {
    log("Navigating to example.com");
    await withTimeout(driver.get("https://example.com"), 15000);

    const title = await driver.getTitle();
    log(`Page title: ${title}`);

    if (title !== "Example Domain") {
      throw new Error(`Unexpected title: ${title}`);
    }

    log("Chrome verification succeeded");
  } finally {
    log("Quitting driver");
    await driver.quit();
  }
}