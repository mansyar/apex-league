const fs = require("fs");
const b64 = fs.readFileSync("artifacts/hint-save.b64", "utf8").trim();
const payload = Buffer.from(b64, "base64").toString("utf8");
await page.goto("http://localhost:5174/");
await page.evaluate((p) => localStorage.setItem("apex.save", p), payload);
await page.reload();
await page.waitForTimeout(1200);
const nameRow = await page.evaluate(() => {
  const badge = [...document.querySelectorAll("*")].find((el) =>
    el.textContent?.trim() === "Juvenile" && el.children.length === 0,
  );
  return badge ? badge.textContent : "no-badge";
});
console.log("badge:", nameRow);
