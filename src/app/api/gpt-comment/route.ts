// app/api/gpt-comment/route.ts

import OpenAI from 'openai'

export const runtime = 'edge' // or remove this line if not using edge runtime

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // .env.local に設定必須
})

export async function POST(req: Request): Promise<Response> {
  try {
    const { memo } = await req.json()

    if (!memo || typeof memo !== 'string') {
      return new Response(JSON.stringify({ comment: '不正な入力です。' }), { status: 400 })
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content:
            'あなたは学習アドバイザーです。学習メモをもとに、前向きで簡潔なアドバイスを1〜2文で日本語で返してください。',
        },
        {
          role: 'user',
          content: `以下の学習記録に対するフィードバックコメントをください:\n${memo}`,
        },
      ],
      temperature: 0.7,
      stream: false,
    })

    const comment = response.choices?.[0]?.message?.content ?? 'コメントが生成できませんでした。'

    return Response.json({ comment })
  } catch (err) {
    console.error('AIコメント生成エラー:', err)
    return new Response(
      JSON.stringify({ comment: 'AIコメントの生成に失敗しました。' }),
      { status: 500 }
    )
  }
}
