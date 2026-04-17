import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import axios from 'axios';
import * as cheerio from 'cheerio';
import pLimit from 'p-limit';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.post('/api/scan', async (req, res) => {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    try {
      const targetUrl = new URL(url.startsWith('http') ? url : `https://${url}`);
      const response = await axios.get(targetUrl.toString(), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
        timeout: 10000,
      });

      const $ = cheerio.load(response.data);
      const links: { href: string; text: string; fullUrl: string }[] = [];

      $('a').each((_, element) => {
        const href = $(element).attr('href');
        const text = $(element).text().trim() || '(no-text)';

        if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
          try {
            const absoluteUrl = new URL(href, targetUrl.toString()).toString();
            links.push({ href, text, fullUrl: absoluteUrl });
          } catch (e) {
            // Ignore invalid URLs
          }
        }
      });

      // Unique links only
      const uniqueLinks = Array.from(new Map(links.map(l => [l.fullUrl, l])).values());

      const limit = pLimit(5); // Limit concurrency to avoid being blocked
      const results = await Promise.all(
        uniqueLinks.map(link =>
          limit(async () => {
            try {
              const checkResponse = await axios.head(link.fullUrl, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                },
                timeout: 5000,
                validateStatus: () => true, // Don't throw on error codes
              });

              // Some servers block HEAD, so try GET if HEAD fails or returns weird
              let finalStatus = checkResponse.status;
              if (finalStatus === 405 || finalStatus === 403 || finalStatus === 404) {
                 try {
                    const getCheck = await axios.get(link.fullUrl, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                        },
                        timeout: 5000,
                        validateStatus: () => true,
                    });
                    finalStatus = getCheck.status;
                 } catch (e) {
                    // Fallback to original HEAD status if GET fails
                 }
              }

              return {
                ...link,
                status: finalStatus,
                statusText: checkResponse.statusText,
              };
            } catch (error: any) {
              return {
                ...link,
                status: error.response?.status || 0,
                statusText: error.code || 'TIMEOUT',
              };
            }
          })
        )
      );

      res.json({
        baseUrl: targetUrl.toString(),
        totalLinks: uniqueLinks.length,
        results,
      });

    } catch (error: any) {
      console.error('Scan error:', error.message);
      res.status(500).json({ error: 'Failed to crawl the URL. Please ensure it is a valid, public website.' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
