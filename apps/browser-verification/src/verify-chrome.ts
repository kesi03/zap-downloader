import { Builder } from "selenium-webdriver";
import chrome from "selenium-webdriver/chrome";

export async function verifyChrome(headless = true) {
  const options = new chrome.Options();
  if (headless) {
    options.addArguments("--headless=new");
  }

  const driver = await new Builder()
    .forBrowser("chrome")
    .setChromeOptions(options)
    .build();

  try {
    await driver.get("https://example.com");
    const title = await driver.getTitle();
    console.log("Page title:", title);
  } finally {
    await driver.quit();
  }
}