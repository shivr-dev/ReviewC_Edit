import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // AI Generation Route
  app.post('/api/generate-questions', async (req, res) => {
    try {
      const { prompt, accountId } = req.body;
      if (!accountId) {
        return res.status(400).json({ error: 'Missing Account ID. 请提供 Cloudflare Account ID。' });
      }

      const token = 'cfut_TbqHfokK5npH4ou57VMvdfCAkWb5X6wG19Z9kzVKf23f75a0';
      const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1/chat/completions`;

      const aiResponse = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: '@cf/qwen/qwen2.5-coder-32b-instruct',
          messages: [
            { 
              role: 'system', 
              content: 'You are a JSON generator. Output strictly a valid JSON array of objects with keys `q` (question), `a` (answer), `cat` (category). Example: [{"q":"什么是量子力学？", "a":"研究微观粒子运动规律的物理学分支", "cat":"物理"}]. Do not include any text outside the JSON array, no markdown blocks. Always answer in the language the user prompted.' 
            },
            { 
              role: 'user', 
              content: prompt 
            }
          ]
        })
      });

      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        throw new Error(`Cloudflare API Error: ${errText}`);
      }

      const aiData = await aiResponse.json();
      
      let aiContent = aiData?.choices?.[0]?.message?.content || aiData?.result?.response || '';
      
      // Cleanup markdown blocks if AI ignored instructions
      aiContent = aiContent.replace(/^[\s\S]*?(?=\[|\{)/, '').replace(/(?<=\]|\})[\s\S]*$/, '').trim();

      try {
        const jsonResult = JSON.parse(aiContent);
        if (Array.isArray(jsonResult)) {
          return res.json({ result: jsonResult });
        } else if (typeof jsonResult === 'object' && jsonResult !== null) {
          return res.json({ result: [jsonResult] });
        } else {
          throw new Error('Parsed JSON is not an object or array');
        }
      } catch (e: any) {
        return res.status(500).json({ error: '无法解析 AI 生成的结果为 JSON, 请重试', raw: aiContent });
      }

    } catch (e: any) {
      console.error('AI Gen Error:', e);
      return res.status(500).json({ error: e.message || 'Server Error' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
