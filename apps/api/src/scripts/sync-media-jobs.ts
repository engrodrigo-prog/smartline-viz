import { syncMediaJob, syncPendingMediaJobs } from "../etl/media/sync.js";

const args = process.argv.slice(2);
const jobIds: string[] = [];

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if ((arg === "--job" || arg === "-j") && args[i + 1]) {
    jobIds.push(args[i + 1]);
    i += 1;
  } else if (!arg.startsWith("-")) {
    jobIds.push(arg);
  }
}

async function main() {
  if (jobIds.length) {
    for (const id of jobIds) {
      const res = await syncMediaJob(id);
      console.log(`job ${res.jobId}: status=${res.status}, itens=${res.inserted}`);
    }
    return;
  }
  const results = await syncPendingMediaJobs();
  results.forEach((res) => {
    console.log(`job ${res.jobId}: status=${res.status}, itens=${res.inserted}`);
  });
}

main().catch((err) => {
  console.error("[media-sync] erro", err);
  process.exitCode = 1;
});
