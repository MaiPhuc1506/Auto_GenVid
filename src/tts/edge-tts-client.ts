import { EdgeTTS, createSRT } from "edge-tts-universal";
import { writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { TtsClient } from "./tts-client.js";

const execFileAsync = promisify(execFile);

export interface EdgeTtsOpts {
  voice: string;         // e.g. "vi-VN-HoaiMyNeural" or "vi-VN-NamMinhNeural"
  rate?: string;         // e.g. "+0%", "+10%", "-5%"
  pitch?: string;        // e.g. "+0Hz"
  volume?: string;       // e.g. "+0%"
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Edge TTS client using Microsoft Edge online text-to-speech service (Free).
 * Uses edge-tts-universal with automatic fallback to python edge-tts CLI.
 *
 * Supports subtitle generation (SRT) via word boundary cues.
 */
export class EdgeTtsClient implements TtsClient {
  constructor(private cfg: EdgeTtsOpts) {}

  async generate(text: string, audioOutPath: string, srtOutPath?: string): Promise<void> {
    await this.synthesizeWithRetry(text, audioOutPath, srtOutPath);
  }

  private async tryPythonEdgeTts(
    text: string,
    audioOutPath: string,
    srtOutPath?: string,
  ): Promise<boolean> {
    try {
      const args = [
        "-m",
        "edge_tts",
        "--voice",
        this.cfg.voice,
        "--text",
        text,
        "--write-media",
        audioOutPath,
        "--no-progress",
      ];
      if (this.cfg.rate && this.cfg.rate !== "+0%") args.push("--rate", this.cfg.rate);
      if (this.cfg.pitch && this.cfg.pitch !== "+0Hz") args.push("--pitch", this.cfg.pitch);
      if (this.cfg.volume && this.cfg.volume !== "+0%") args.push("--volume", this.cfg.volume);
      if (srtOutPath) args.push("--write-subtitles", srtOutPath);

      await execFileAsync("python3", args);
      return true;
    } catch {
      return false;
    }
  }

  private async synthesizeWithRetry(
    text: string,
    audioOutPath: string,
    srtOutPath?: string,
  ): Promise<void> {
    const delays = [1000, 2000, 4000];
    let lastErr: unknown;

    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const tts = new EdgeTTS(text, this.cfg.voice, {
          rate: this.cfg.rate ?? "+0%",
          pitch: this.cfg.pitch ?? "+0Hz",
          volume: this.cfg.volume ?? "+0%",
        });

        // Timeout of 3500ms to detect dead websocket / 403 hang in edge-tts-universal
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("EdgeTTS synthesize timeout")), 3500)
        );

        const result = await Promise.race([tts.synthesize(), timeoutPromise]);
        const buffer = Buffer.from(await result.audio.arrayBuffer());
        if (buffer.length === 0) {
          throw new Error("Edge TTS returned empty audio buffer");
        }
        await writeFile(audioOutPath, buffer);

        if (srtOutPath && result.subtitle && result.subtitle.length > 0) {
          const srtContent = createSRT(result.subtitle);
          await writeFile(srtOutPath, srtContent, "utf8");
        }
        return;
      } catch (e) {
        lastErr = e;
        if (!process.env.VITEST) {
          const pythonOk = await this.tryPythonEdgeTts(text, audioOutPath, srtOutPath);
          if (pythonOk) return;
        }
        if (attempt === delays.length) throw e;
        await sleep(delays[attempt]);
      }
    }
    throw lastErr;
  }
}

