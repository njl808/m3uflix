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

// Function to rewrite m3u8 playlist URIs to go through our proxy
function rewriteM3U8Playlist(
  playlistContent: string,
  originalServerUrl: string,
  streamType: string,
  username: string,
  password: string,
  proxyHost: string,
  protocol: string
): string {
  const lines = playlistContent.split('\n');
  const rewrittenLines: string[] = [];

  for (let line of lines) {
    // Skip empty lines and comments (lines starting with #)
    if (!line.trim() || line.startsWith('#')) {
      rewrittenLines.push(line);
      continue;
    }

    // This is likely a segment URI
    let segmentUri = line.trim();
    
    if (segmentUri) {
      // Handle different types of URIs in HLS playlists
      if (segmentUri.startsWith('http://') || segmentUri.startsWith('https://')) {
        // Absolute URL - extract the segment filename and parameters
        try {
          const url = new URL(segmentUri);
          const pathParts = url.pathname.split('/');
          const filename = pathParts[pathParts.length - 1];
          
          // Extract extension from filename (usually .ts for segments)
          const extensionMatch = filename.match(/\.([^.?]+)(\?|$)/);
          const extension = extensionMatch ? extensionMatch[1] : 'ts';
          
          // Extract just the filename without extension for the stream ID
          const baseFilename = filename.replace(/\.[^.?]+(\?.*)?$/, '');
          
          // Build the proxied URL
          const proxiedUrl = `${protocol}://${proxyHost}/api/stream/${streamType}/${username}/${password}/${baseFilename}.${extension}?server=${encodeURIComponent(originalServerUrl)}`;
          rewrittenLines.push(proxiedUrl);
          
          console.log(`[M3U8 REWRITE] Absolute URI: ${segmentUri} -> ${proxiedUrl}`);
        } catch (error) {
          console.error(`[M3U8 REWRITE] Failed to parse absolute URL: ${segmentUri}`, error);
          rewrittenLines.push(segmentUri); // Keep original on error
        }
        
      } else if (segmentUri.includes('.')) {
        // Relative path with extension - assume it's a segment file
        const filename = segmentUri.split('/').pop() || segmentUri;
        
        // Extract extension (usually .ts for segments)
        const extensionMatch = filename.match(/\.([^.?]+)(\?|$)/);
        const extension = extensionMatch ? extensionMatch[1] : 'ts';
        
        // Extract just the filename without extension for the stream ID
        const baseFilename = filename.replace(/\.[^.?]+(\?.*)?$/, '');
        
        // Build the proxied URL for relative segments
        const proxiedUrl = `${protocol}://${proxyHost}/api/stream/${streamType}/${username}/${password}/${baseFilename}.${extension}?server=${encodeURIComponent(originalServerUrl)}`;
        rewrittenLines.push(proxiedUrl);
        
        console.log(`[M3U8 REWRITE] Relative URI: ${segmentUri} -> ${proxiedUrl}`);
        
      } else if (segmentUri.match(/^\d+$/)) {
        // Pure numeric segment (some IPTV providers use this)
        const proxiedUrl = `${protocol}://${proxyHost}/api/stream/${streamType}/${username}/${password}/${segmentUri}.ts?server=${encodeURIComponent(originalServerUrl)}`;
        rewrittenLines.push(proxiedUrl);
        
        console.log(`[M3U8 REWRITE] Numeric segment: ${segmentUri} -> ${proxiedUrl}`);
        
      } else {
        // Unknown format - keep original
        console.log(`[M3U8 REWRITE] Unknown segment format, keeping original: ${segmentUri}`);
        rewrittenLines.push(segmentUri);
      }
    } else {
      rewrittenLines.push(line);
    }
  }

  return rewrittenLines.join('\n');
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Xtream API Proxy Routes
  app.post('/api/xtream/authenticate', async (req, res) => {
    try {
      const { config } = xtreamProxySchema.parse(req.body);
      let { serverUrl, username, password } = config;

      // If the app is served over HTTPS, try to upgrade the provider URL to HTTPS too.
      if (req.protocol === 'https' && serverUrl.startsWith('http://')) {
        console.log(`[API PROXY] Upgrading API request for ${serverUrl} to HTTPS.`);
        serverUrl = serverUrl.replace('http://', 'https://');
      }

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
      let { serverUrl, username, password } = config;

      // If the app is served over HTTPS, try to upgrade the provider URL to HTTPS too.
      if (req.protocol === 'https' && serverUrl.startsWith('http://')) {
        console.log(`[API PROXY] Upgrading API request for ${serverUrl} to HTTPS.`);
        serverUrl = serverUrl.replace('http://', 'https://');
      }

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
      let { serverUrl, username, password } = config;

      // If the app is served over HTTPS, try to upgrade the provider URL to HTTPS too.
      if (req.protocol === 'https' && serverUrl.startsWith('http://')) {
        console.log(`[API PROXY] Upgrading API request for ${serverUrl} to HTTPS.`);
        serverUrl = serverUrl.replace('http://', 'https://');
      }

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
      let { serverUrl, username, password } = config;

      // If the app is served over HTTPS, try to upgrade the provider URL to HTTPS too.
      if (req.protocol === 'https' && serverUrl.startsWith('http://')) {
        console.log(`[API PROXY] Upgrading API request for ${serverUrl} to HTTPS.`);
        serverUrl = serverUrl.replace('http://', 'https://');
      }

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
      let { serverUrl, username, password } = config;

      // If the app is served over HTTPS, try to upgrade the provider URL to HTTPS too.
      if (req.protocol === 'https' && serverUrl.startsWith('http://')) {
        console.log(`[API PROXY] Upgrading API request for ${serverUrl} to HTTPS.`);
        serverUrl = serverUrl.replace('http://', 'https://');
      }

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
      let { serverUrl, username, password } = config;

      // If the app is served over HTTPS, try to upgrade the provider URL to HTTPS too.
      if (req.protocol === 'https' && serverUrl.startsWith('http://')) {
        console.log(`[API PROXY] Upgrading API request for ${serverUrl} to HTTPS.`);
        serverUrl = serverUrl.replace('http://', 'https://');
      }

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


  // Video streaming proxy route - handle GET, HEAD, and OPTIONS
  app.use('/api/stream/:type/:username/:password/:streamId.:extension', async (req, res) => {
    // Handle OPTIONS preflight request
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Range, Content-Length, Content-Type');
      return res.status(200).end();
    }

    // Only allow GET and HEAD requests for actual streaming
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    try {
      const { type, username, password, streamId, extension } = req.params;
      let serverUrl = req.query.server as string;

      if (!serverUrl) {
        return res.status(400).json({ error: 'Server URL is required' });
      }

      // If the app is served over HTTPS, try to upgrade the provider URL to HTTPS too.
      if (req.protocol === 'https' && serverUrl.startsWith('http://')) {
        console.log(`[VIDEO PROXY] Upgrading upstream request for ${serverUrl} to HTTPS.`);
        serverUrl = serverUrl.replace('http://', 'https://');
      }

      // Build the original stream URL
      const streamUrl = `${serverUrl}/${type}/${username}/${password}/${streamId}.${extension}`;

      console.log(`[VIDEO PROXY] Requesting: ${streamUrl.replace(password, '***')}`);

      // Add random delay to avoid CloudFlare rate limiting
      // Reduced delay for TS segments (live streaming)
      if (extension === 'ts') {
        const delay = Math.random() * 500 + 200; // 200-700ms for TS segments
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        const delay = Math.random() * 2000 + 1000; // 1000-3000ms for other files
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      // Set appropriate headers for streaming
      const contentType = extension === 'ts' ? 'video/mp2t' : 
                          extension === 'm3u8' ? 'application/vnd.apple.mpegurl' : 
                          `video/${extension}`;
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Range, Content-Length, Content-Type');
      
      // Only set Accept-Ranges for video files, not for HLS playlists
      if (extension !== 'm3u8') {
        res.setHeader('Accept-Ranges', 'bytes');
      }

      // Forward the request to the actual stream with stable IPTV headers
      // Use stable User-Agent to avoid WAF fingerprint detection
      const stableUserAgent = 'VLC/3.0.20 LibVLC/3.0.20';
      
      const headers: Record<string, string> = {
        'User-Agent': stableUserAgent,
        'Accept': extension === 'm3u8' ? 'application/vnd.apple.mpegurl,*/*' : '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache'
        // Removed browser-only Sec-Fetch-* headers that trigger WAF
      };

      // Add range header for video files - CRITICAL for IPTV servers
      if (extension !== 'm3u8') {
        // Always send Range header for video files, IPTV servers expect it
        headers['Range'] = req.headers.range || 'bytes=0-';
      }

      // Add referer if present
      if (req.headers.referer) {
        headers['Referer'] = req.headers.referer;
      }

      // Add timeout control using AbortController
      const abortController = new AbortController();
      // Shorter timeout for live TS segments to prevent buffering issues
      const timeout = extension === 'ts' ? 15000 : 60000; // 15s for TS, 60s for others
      const timeoutId = setTimeout(() => {
        abortController.abort();
      }, timeout);

      let streamResponse: Response;
      let retryCount = 0;
      const maxRetries = 2;

      try {
        // Handle HEAD requests properly
        const fetchOptions: RequestInit = {
          method: req.method, // Forward HEAD as HEAD, GET as GET
          headers,
          signal: abortController.signal
        };

        streamResponse = await fetch(streamUrl, fetchOptions);

        // Retry logic for 406 errors with delay
        while (streamResponse.status === 406 && retryCount < maxRetries) {
          console.log(`[VIDEO PROXY] Got 406, retrying... (${retryCount + 1}/${maxRetries})`);
          retryCount++;
          
          // Wait 1.2-1.8 seconds before retry
          await new Promise(resolve => setTimeout(resolve, 1200 + Math.random() * 600));
          
          streamResponse = await fetch(streamUrl, fetchOptions);
        }

        clearTimeout(timeoutId);

        console.log(`[VIDEO PROXY] Response status: ${streamResponse.status}, headers:`, streamResponse.headers);

        if (!streamResponse.ok) {
          console.error(`[VIDEO PROXY] Stream failed: ${streamResponse.status} - ${streamResponse.statusText}`);
          return res.status(streamResponse.status).json({ 
            error: 'Stream not available',
            details: `Server returned ${streamResponse.status}`,
            url: streamUrl.replace(password, '***') // Hide password in logs
          });
        }

        // CRITICAL: Handle m3u8 playlists differently - rewrite segment URIs
        if (extension === 'm3u8') {
          console.log(`[VIDEO PROXY] Processing m3u8 playlist for rewriting`);
          
          const playlistText = await streamResponse.text();
          console.log(`[VIDEO PROXY] Original playlist length: ${playlistText.length} chars`);
          
          // Rewrite the playlist to proxy all segments through our server
          // Force HTTPS to avoid mixed content issues in Replit
          const protocol = req.get('x-forwarded-proto') || req.protocol || 'https';
          const actualProtocol = 'https'; // Always use HTTPS to fix mixed content
          
          console.log(`[VIDEO PROXY] Using protocol: ${actualProtocol} for rewritten URLs`);
          
          const rewrittenPlaylist = rewriteM3U8Playlist(
            playlistText, 
            serverUrl, 
            type, 
            username, 
            password, 
            req.get('host') || 'localhost:5000',
            actualProtocol
          );
          
          console.log(`[VIDEO PROXY] Rewritten playlist length: ${rewrittenPlaylist.length} chars`);
          
          // Set content length for the rewritten playlist
          res.setHeader('Content-Length', Buffer.byteLength(rewrittenPlaylist, 'utf8'));
          res.status(streamResponse.status);
          res.send(rewrittenPlaylist);
          return;
        }

        // Forward headers from the stream response (for non-m3u8 files)
        if (streamResponse.headers.get('content-length')) {
          res.setHeader('Content-Length', streamResponse.headers.get('content-length')!);
        }
        if (streamResponse.headers.get('content-range')) {
          res.setHeader('Content-Range', streamResponse.headers.get('content-range')!);
        }

        // Set appropriate status code
        res.status(streamResponse.status);

        // Handle HEAD requests - only send headers, no body
        if (req.method === 'HEAD') {
          res.status(streamResponse.status);
          return;
        }

        // Pipe the stream to the response (for non-m3u8 files)  
        if (streamResponse.body) {
          const reader = streamResponse.body.getReader();

          const pump = async () => {
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                // Check if response is still writable before writing
                if (!res.writableEnded && !res.destroyed) {
                  res.write(value);
                } else {
                  console.log('[VIDEO PROXY] Client disconnected, stopping stream');
                  break;
                }
              }
              if (!res.writableEnded) {
                res.end();
              }
            } catch (error: any) {
              // Better error handling for connection drops
              if (error.name === 'AbortError' || error.code === 'UND_ERR_SOCKET') {
                console.log('[VIDEO PROXY] Connection closed by client or server');
              } else {
                console.error('Stream error:', error);
              }
              if (!res.writableEnded && !res.destroyed) {
                res.end();
              }
            }
          };

          pump();
        } else {
          res.end();
        }

      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
          console.error('Video proxy timeout:', streamUrl.replace(password, '***'));
          return res.status(408).json({ error: 'Request timeout - stream took too long to respond' });
        }
        throw error;
      }

    } catch (error) {
      console.error('Video proxy error:', error);
      res.status(500).json({ error: 'Failed to proxy video stream' });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
