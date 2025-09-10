import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";

// Xtream API proxy schemas
const xtreamConfigSchema = z.object({
  serverUrl: z.string().url(),
  username: z.string().min(1),
  password: z.string().min(1),
});

const xtreamProxySchema = z.object({
  config: xtreamConfigSchema,
  action: z.string().optional(),
  categoryId: z.string().optional(),
  streamId: z.number().optional(),
  vodId: z.number().optional(),
  seriesId: z.number().optional(),
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Xtream API Proxy Routes
  app.post('/api/xtream/authenticate', async (req, res) => {
    try {
      const { config } = xtreamProxySchema.parse(req.body);
      const { serverUrl, username, password } = config;
      
      const baseUrl = `${serverUrl.replace(/\/$/, '')}/player_api.php?username=${username}&password=${password}`;
      
      const response = await fetch(baseUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('Xtream authenticate error:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Authentication failed' });
    }
  });

  app.post('/api/xtream/categories', async (req, res) => {
    try {
      const { config, action } = xtreamProxySchema.parse(req.body);
      const { serverUrl, username, password } = config;
      
      const baseUrl = `${serverUrl.replace(/\/$/, '')}/player_api.php?username=${username}&password=${password}&action=${action}`;
      
      const response = await fetch(baseUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('Xtream categories error:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch categories' });
    }
  });

  app.post('/api/xtream/streams', async (req, res) => {
    try {
      const { config, action, categoryId } = xtreamProxySchema.parse(req.body);
      const { serverUrl, username, password } = config;
      
      let url = `${serverUrl.replace(/\/$/, '')}/player_api.php?username=${username}&password=${password}&action=${action}`;
      if (categoryId) {
        url += `&category_id=${categoryId}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('Xtream streams error:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch streams' });
    }
  });

  app.post('/api/xtream/epg', async (req, res) => {
    try {
      const { config, streamId } = xtreamProxySchema.parse(req.body);
      const { serverUrl, username, password } = config;
      
      const url = `${serverUrl.replace(/\/$/, '')}/player_api.php?username=${username}&password=${password}&action=get_short_epg&stream_id=${streamId}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('Xtream EPG error:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch EPG' });
    }
  });

  app.post('/api/xtream/vod-info', async (req, res) => {
    try {
      const { config, vodId } = xtreamProxySchema.parse(req.body);
      const { serverUrl, username, password } = config;
      
      const url = `${serverUrl.replace(/\/$/, '')}/player_api.php?username=${username}&password=${password}&action=get_vod_info&vod_id=${vodId}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('Xtream VOD info error:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch VOD info' });
    }
  });

  app.post('/api/xtream/series-info', async (req, res) => {
    try {
      const { config, seriesId } = xtreamProxySchema.parse(req.body);
      const { serverUrl, username, password } = config;
      
      const url = `${serverUrl.replace(/\/$/, '')}/player_api.php?username=${username}&password=${password}&action=get_series_info&series_id=${seriesId}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('Xtream series info error:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch series info' });
    }
  });

  // Video streaming proxy route
  app.get('/api/stream/:type/:username/:password/:streamId.:extension', async (req, res) => {
    try {
      const { type, username, password, streamId, extension } = req.params;
      const serverUrl = req.query.server as string;
      
      if (!serverUrl) {
        return res.status(400).json({ error: 'Server URL is required' });
      }
      
      // Build the original stream URL
      const streamUrl = `${serverUrl}/${type}/${username}/${password}/${streamId}.${extension}`;
      
      // Set appropriate headers for video streaming
      res.setHeader('Content-Type', `video/${extension === 'ts' ? 'mp2t' : extension}`);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Range, Content-Length, Content-Type');
      res.setHeader('Accept-Ranges', 'bytes');
      
      // Forward the request to the actual stream
      const streamResponse = await fetch(streamUrl, {
        headers: {
          'Range': req.headers.range || '',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (!streamResponse.ok) {
        return res.status(streamResponse.status).json({ error: 'Stream not available' });
      }
      
      // Forward headers from the stream response
      if (streamResponse.headers.get('content-length')) {
        res.setHeader('Content-Length', streamResponse.headers.get('content-length')!);
      }
      if (streamResponse.headers.get('content-range')) {
        res.setHeader('Content-Range', streamResponse.headers.get('content-range')!);
      }
      
      // Set appropriate status code
      res.status(streamResponse.status);
      
      // Pipe the stream to the response
      if (streamResponse.body) {
        const reader = streamResponse.body.getReader();
        
        const pump = async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              res.write(value);
            }
            res.end();
          } catch (error) {
            console.error('Stream error:', error);
            res.end();
          }
        };
        
        pump();
      } else {
        res.end();
      }
      
    } catch (error) {
      console.error('Video proxy error:', error);
      res.status(500).json({ error: 'Failed to proxy video stream' });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
