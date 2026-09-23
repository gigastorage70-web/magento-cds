import { NextResponse } from "next/server";
import { exec } from "child_process";
import util from "util";

const execPromise = util.promisify(exec);

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const cwd = process.cwd();

    // 1. Stage changes in public/images and manifest.json
    await execPromise("git add public/images public/manifest.json", { cwd });

    // 2. Check if anything to commit
    try {
      await execPromise("git diff --cached --quiet", { cwd });
      return NextResponse.json({
        success: true,
        message: "No new image changes detected to sync.",
      });
    } catch (diffErr) {
      // Non-zero exit code means there ARE changes to commit
      await execPromise('git commit -m "Upload image(s) via web gallery"', { cwd });
      await execPromise("git push origin main", { cwd });

      return NextResponse.json({
        success: true,
        message: "Successfully pushed to GitHub! Vercel is now deploying your new images.",
      });
    }
  } catch (error) {
    console.error("Git push error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to push to GitHub" },
      { status: 500 }
    );
  }
}
