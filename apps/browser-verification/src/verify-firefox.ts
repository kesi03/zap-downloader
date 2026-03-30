import { Builder } from "selenium-webdriver";
import firefox from "selenium-webdriver/firefox";

async function verifyFirefox() {
  const options = new firefox.Options();
  options.addArguments("-headless");

  const driver = await new Builder()
    .forBrowser("firefox")
    .setFirefoxOptions(options)
    .build();

  try {
    await driver.get("https://example.com");
    const title = await driver.getTitle();
    console.log("Firefox page title:", title);
  } finally {
    await driver.quit();
  }
}