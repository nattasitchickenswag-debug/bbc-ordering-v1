import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const EXTRACT_PROMPT = `อ่านบิลรับไก่แล้วดึงข้อมูลออกมาเป็น JSON เท่านั้น ไม่ต้องอธิบายเพิ่มเติม
ถ้าไม่มีรายการใดให้ใส่ 0

{
  "ton_count": จำนวนตัว ไก่ตอน (number),
  "ton_weight": น้ำหนักรวม ไก่ตอน กก. (number),
  "ton_price": ราคา/กก. ไก่ตอน (number),
  "nsot_weight": น้ำหนัก นสต./นอก กก. (number),
  "nsot_price": ราคา/กก. นสต. (number),
  "nom_weight": น้ำหนัก นม/น้ำมันไก่ กก. (number),
  "nom_price": ราคา/กก. นม (number),
  "kha_weight": น้ำหนัก ขาไก่ กก. (number),
  "kha_price": ราคา/กก. ขาไก่ (number),
  "blood_count": จำนวน เลือด ก้อน (number),
  "blood_price": ราคา/ก้อน เลือด (number)
}`;

const VOICE_PROMPT = (text: string) =>
  `จากข้อความที่พูดเกี่ยวกับบิลรับไก่: "${text}"
ดึงข้อมูลออกมาเป็น JSON เท่านั้น ไม่ต้องอธิบายเพิ่มเติม ถ้าไม่มีรายการใดให้ใส่ 0

{
  "ton_count": จำนวนตัว ไก่ตอน (number),
  "ton_weight": น้ำหนักรวม ไก่ตอน กก. (number),
  "ton_price": ราคา/กก. ไก่ตอน (number),
  "nsot_weight": น้ำหนัก นสต. กก. (number),
  "nsot_price": ราคา/กก. นสต. (number),
  "nom_weight": น้ำหนัก นม/น้ำมันไก่ กก. (number),
  "nom_price": ราคา/กก. นม (number),
  "kha_weight": น้ำหนัก ขาไก่ กก. (number),
  "kha_price": ราคา/กก. ขาไก่ (number),
  "blood_count": จำนวน เลือด ก้อน (number),
  "blood_price": ราคา/ก้อน เลือด (number)
}`;

function extractJSON(raw: string) {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch { return null; }
}

export async function POST(req: Request) {
  try {
    const { mode, image, text } = await req.json();

    let messages: OpenAI.Chat.ChatCompletionMessageParam[];

    if (mode === "image") {
      messages = [{
        role: "user",
        content: [
          { type: "text", text: EXTRACT_PROMPT },
          { type: "image_url", image_url: { url: image, detail: "high" } },
        ],
      }];
    } else {
      messages = [{
        role: "user",
        content: VOICE_PROMPT(text),
      }];
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      max_tokens: 400,
    });

    const raw = response.choices[0].message.content || "{}";
    const parsed = extractJSON(raw);
    if (!parsed) return NextResponse.json({ error: "อ่านไม่ออกครับ ลองใหม่อีกครั้ง" }, { status: 422 });

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("scan error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
