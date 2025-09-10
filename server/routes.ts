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

  const httpServer = createServer(app);

  return httpServer;
}
