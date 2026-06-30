const APP_ID = process.env.BASE44_APP_ID;
const API_KEY = process.env.BASE44_API_KEY;
const BASE_URL = `https://app.base44.com/api/apps/${APP_ID}/entities/EconomicEvent`;

const IMPACT_MAP = {
  "High": "High",
  "Medium": "Medium",
  "Low": "Low",
  "Holiday": "Low"
};

async function main() {
  // 1. گرفتن داده از فارکس فکتوری
  const ffRes = await fetch("https://nfs.faireconomy.media/ff_calendar_thisweek.json", {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      "Referer": "https://www.forexfactory.com/calendar"
    }
  });

  if (!ffRes.ok) {
    throw new Error(`خطا در دریافت داده از فارکس فکتوری: ${ffRes.status}`);
  }

  const ffData = await ffRes.json();
  console.log(`تعداد رویدادهای دریافتی: ${ffData.length}`);

  // 2. تبدیل فرمت داده به ساختار Base44
  const events = ffData
    .filter(item => IMPACT_MAP[item.impact]) // فقط رویدادهای با impact معتبر
    .map(item => ({
      title: item.title || "بدون عنوان",
      currency: item.country, // در JSON فارکس فکتوری، country همون کد ارز است (مثل USD)
      impact: IMPACT_MAP[item.impact],
      event_date: item.date, // تاریخ و زمان رویداد
      previous_value: item.previous || "",
      forecast_value: item.forecast || "",
      actual_value: item.actual || "",
      description: item.title || ""
    }))
    .filter(e => ["USD","EUR","GBP","JPY","CHF","AUD","CAD","NZD"].includes(e.currency)); // فقط ارزهای پشتیبانی‌شده در Base44

  console.log(`تعداد رویدادهای معتبر برای ارسال: ${events.length}`);

  // 3. پاک کردن رکوردهای قبلی (برای جلوگیری از تکرار)
  const deleteRes = await fetch(BASE_URL, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "api_key": API_KEY
    },
    body: JSON.stringify({}) // خالی یعنی همه رکوردها پاک شوند
  });

  if (!deleteRes.ok) {
    console.warn(`هشدار در پاک کردن رکوردهای قبلی: ${deleteRes.status}`);
  } else {
    console.log("رکوردهای قبلی با موفقیت پاک شدند.");
  }

  // 4. ارسال داده‌های جدید به صورت دسته‌ای (bulk)
  const bulkRes = await fetch(`${BASE_URL}/bulk`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api_key": API_KEY
    },
    body: JSON.stringify(events)
  });

  if (!bulkRes.ok) {
    const errText = await bulkRes.text();
    throw new Error(`خطا در ارسال داده به Base44: ${bulkRes.status} - ${errText}`);
  }

  const result = await bulkRes.json();
  console.log(`با موفقیت ${events.length} رویداد ذخیره شد.`);
}

main().catch(err => {
  console.error("خطا در اجرای اسکریپت:", err.message);
  process.exit(1);
});
