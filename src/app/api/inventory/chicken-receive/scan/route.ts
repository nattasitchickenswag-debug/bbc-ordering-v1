import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SCALE_PROMPT = `ดูตัวเลขบนจอตาชั่งดิจิตอลในรูป แล้วตอบเป็น JSON เท่านั้น ไม่ต้องอธิบายเพิ่ม
อ่านเฉพาะตัวเลขน้ำหนัก (กิโลกรัม) ที่แสดงบนจอ
สำคัญมาก: เก็บทศนิยมให้ครบทุกหลักตามที่เห็นบนจอ ห้ามปัดเศษ เช่น 11.758 ให้ตอบ 11.758 ไม่ใช่ 11.76

{ "weight": ตัวเลขน้ำหนักครบทศนิยมตามจอ เช่น 11.758 (number) }

ถ้าอ่านไม่ออกหรือไม่เห็นตัวเลขชัดให้ตอบ { "weight": null }`;

function extractJSON(raw: string) {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch { return null; }
}

export async function POST(req: Request) {
  try {
    const { image } = await req.json();
    if (!image) return NextResponse.json({ error: "No image" }, { status: 400 });

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{
        role: "user",
        content: [
          { type: "text", text: SCALE_PROMPT },
          { type: "image_url", image_url: { url: image, detail: "low" } },
        ],
      }],
      max_tokens: 100,
    });

    const raw = response.choices[0].message.content || "{}";
    const parsed = extractJSON(raw);
    if (!parsed || parsed.weight === null) {
      return NextResponse.json({ error: "อ่านไม่ออกครับ ลองถ่ายใหม่ให้เห็นจอชัดขึ้น" }, { status: 422 });
    }
    return NextResponse.json({ weight: parsed.weight });
  } catch (err) {
    console.error("scale scan error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
