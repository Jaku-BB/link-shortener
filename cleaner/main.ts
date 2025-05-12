import { findExpiredEntries, deleteEntry } from "./database.ts";

const TTL_SECONDS = Number(Deno.env.get("TTL_SECONDS") || "3600");
const CLEANUP_INTERVAL_MS = Number(Deno.env.get("CLEANUP_INTERVAL_MS") || "60000");

console.log(`Cleaner service started. TTL set to ${TTL_SECONDS} second(s)`);
console.log(`Cleanup will run every ${CLEANUP_INTERVAL_MS / 1000} seconds`);

const runCleanup = async () => {
  console.log(`Starting cleanup. Removing entries older than ${TTL_SECONDS} second(s)...`);
  
  const expiredEntries = await findExpiredEntries(TTL_SECONDS);
  
  if (expiredEntries.rowLength === 0) {
    console.log("No expired entries found");
    return;
  }
  
  console.log(`Found ${expiredEntries.rowLength} expired entries to delete`);
  
  let deletedCount = 0;
  for (const entry of expiredEntries.rows) {
    try {
      await deleteEntry(entry.id);
      console.log(`Deleted entry with short code: ${entry.short_code}, created at: ${entry.created_at}`);
      deletedCount++;
    } catch (error) {
      console.error(`Failed to delete entry with ID ${entry.id}:`, error);
    }
  }
  
  console.log(`Cleanup completed. Deleted ${deletedCount} entries`);
};

runCleanup();

setInterval(async () => {
  try {
    await runCleanup();
  } catch (error) {
    console.error("Error during scheduled cleanup:", error);
  }
}, CLEANUP_INTERVAL_MS); 