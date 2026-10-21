import type { Script } from "../render/script-schema.js";

/**
 * Normalizes numbers and technical terms into spoken Vietnamese phonetics for TTS.
 */
export function normalizeVietnameseForTts(text: string): string {
  let res = text;

  // Decimal versions: e.g. GPT 5.5 -> GPT năm chấm năm, iOS 18.2 -> iOS mười tám chấm hai
  res = res.replace(/(\d+)\.(\d+)/g, "$1 chấm $2");

  // Percentages: 82.7% -> 82 chấm 7 phần trăm
  res = res.replace(/(\d+)(?:\s*(?:phẩy|chấm)\s*(\d+))?%/g, (_, intPart, decPart) => {
    return decPart ? `${intPart} phẩy ${decPart} phần trăm` : `${intPart} phần trăm`;
  });

  // Multipliers: 10x -> gấp mười lần, 2x -> gấp đôi
  res = res.replace(/\b2x\b/gi, "gấp đôi");
  res = res.replace(/\b(\d+)x\b/gi, "gấp $1 lần");

  // Common units
  res = res.replace(/\b(\d+)\s*MP\b/gi, "$1 megapixel");
  res = res.replace(/\b(\d+)\s*mAh\b/gi, "$1 miliampe giờ");
  res = res.replace(/\b(\d+)\s*GB\b/gi, "$1 gigabyte");
  res = res.replace(/\b(\d+)\s*TB\b/gi, "$1 terabyte");
  res = res.replace(/\$(\d+)/g, "$1 đô la");
  res = res.replace(/\b(\d+)\s*tr(?:iệu)?\s*đ(?:ồng)?\b/gi, "$1 triệu đồng");

  // Common English tech acronyms in Vietnamese speech
  res = res.replace(/\bAI\b/g, "ây ai");
  res = res.replace(/\bAPI\b/g, "ây pi ai");
  res = res.replace(/\bUI\b/g, "giao diện");
  res = res.replace(/\bUX\b/g, "trải nghiệm");

  // Remove unsupported punctuation & symbols
  res = res.replace(/[#@$%^&*_+=\\~<>[\]{}|]/g, " ");
  res = res.replace(/\s+/g, " ").trim();

  return res;
}

export interface GenerateScriptOptions {
  title: string;
  content: string;
  url?: string;
  domain?: string;
  image?: string | null;
  channel?: string;
  voiceProvider?: string;
  voiceId?: string;
  speed?: number;
}

function limitToSentences(text: string, maxChars = 160): string {
  if (!text) return "";
  // Split into sentences
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  let res = "";
  for (const s of sentences) {
    const trimmed = s.trim();
    if ((res + " " + trimmed).trim().length <= maxChars) {
      res = (res + " " + trimmed).trim();
    } else {
      break;
    }
  }
  if (!res) {
    res = text.slice(0, maxChars).trim();
    if (!/[.!?]$/.test(res)) res += ".";
  }
  return res;
}

/**
 * Generates a valid Script JSON compliant with ScriptSchema.
 */
export async function generateScriptFromContent(opts: GenerateScriptOptions): Promise<Script> {
  const {
    title,
    content,
    url = "local",
    domain = "local",
    image = null,
    channel = "Tin Tức AI 24h",
    voiceProvider = "edge-tts",
    voiceId = "vi-VN-NamMinhNeural",
    speed = 1.0,
  } = opts;

  // Split content into clean chunks
  const cleanLines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 20 && !l.includes("{") && !l.includes("}"));

  // Extract concise sentences for each body scene
  const lead = limitToSentences(cleanLines[0] || title, 160);
  const second = limitToSentences(
    cleanLines[1] || "Công nghệ mới mang lại nhiều cải tiến đột phá so với các thế hệ trước.",
    160
  );
  const third = limitToSentences(
    cleanLines[2] || "Dự kiến sẽ tác động mạnh mẽ đến thị trường và người dùng trong thời gian tới.",
    160
  );

  // Hook headline and subhead (respecting schema limits: max 40 chars)
  const hookHeadline = (title.length > 38 ? title.slice(0, 38).trim() : title) || "Tin Nóng Công Nghệ";
  const hookSubhead = "Cập Nhật Mới Nhất!";

  const hookVoice = normalizeVietnameseForTts(
    title.length > 80 ? title.slice(0, 80).trim() + "." : (title.endsWith(".") || title.endsWith("!") ? title : `${title}!`)
  );

  const body1Voice = normalizeVietnameseForTts(lead);
  const body2Voice = normalizeVietnameseForTts(second);
  const body3Voice = normalizeVietnameseForTts(third);

  const script: Script = {
    version: "1.0",
    metadata: {
      title,
      source: {
        url,
        domain: domain.slice(0, 40),
        image: image && image.startsWith("http") ? image : null,
      },
      channel: channel.slice(0, 30),
    },
    voice: {
      provider: voiceProvider,
      voiceId,
      speed,
    },
    scenes: [
      {
        id: "hook",
        type: "hook",
        voiceText: hookVoice,
        templateData: {
          template: "hook",
          headline: hookHeadline.slice(0, 40),
          subhead: hookSubhead.slice(0, 40),
          kenBurns: "zoom-in",
        },
      },
      {
        id: "body-1",
        type: "body",
        voiceText: body1Voice,
        templateData: {
          template: "stat-hero",
          value: "NỔI BẬT",
          label: (title.slice(0, 36) + (title.length > 36 ? "..." : "")).slice(0, 40),
          context: "Bước tiến công nghệ mới nhất",
        },
      },
      {
        id: "body-2",
        type: "body",
        voiceText: body2Voice,
        templateData: {
          template: "feature-list",
          title: "Các Điểm Đột Phá",
          bullets: [
            "Tối ưu hiệu năng vượt trội",
            "Trải nghiệm mượt mà hiện đại",
            "Tự động hoá quy trình thông minh",
          ],
          icon: "spark",
        },
      },
      {
        id: "body-3",
        type: "body",
        voiceText: body3Voice,
        templateData: {
          template: "callout",
          statement: second.slice(0, 75) + (second.length > 75 ? "..." : ""),
          tag: "Đánh Giá",
        },
      },
      {
        id: "outro",
        type: "outro",
        voiceText: `Theo dõi ${channel} để xem bản tin mới mỗi ngày.`,
        templateData: {
          template: "outro",
          ctaTop: "Xem bản tin mới mỗi ngày",
          channelName: channel.slice(0, 30),
          source: `Nguồn: ${domain}`.slice(0, 40),
        },
      },
    ],
  };

  return script;
}
