/* >>> SMARTLINE-EROSION: ts-hook */
import { spawn } from "child_process";

export async function runErosionPipeline({ dtmPath, soilPath }: { dtmPath: string; soilPath: string }) {
  const py = (args: string[]) =>
    new Promise<void>((resolve, reject) => {
      const child = spawn("python", args, { stdio: "inherit" });
      child.on("exit", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Processo python finalizado com código ${code}`));
        }
      });
    });

  await py(["process/dtm_derivatives.py", "--dtm", dtmPath, "--ls-m", "0.5", "--ls-n", "1.3", "--fa-type", "cells"]);
  await py(["process/risk_index.py", "--dtm", dtmPath, "--soil", soilPath, "--ndvi-c", "1.0"]);
  await py(["scripts/build_cogs.py", "outputs/risk_0_100.tif", "outputs/a_rusle.tif"]);
}
/* <<< SMARTLINE-EROSION: ts-hook */
