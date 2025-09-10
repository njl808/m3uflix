import { XtreamConfig, XtreamUserInfo, XtreamCategory, XtreamStream, XtreamVOD, XtreamSeries, XtreamEPG } from "@/types/xtream";

export class XtreamAPI {
  private serverUrl: string;
  private username: string;
  private password: string;
  private baseUrl: string;

  constructor(config: XtreamConfig) {
    this.serverUrl = config.serverUrl.replace(/\/$/, '');
    this.username = config.username;
    this.password = config.password;
    this.baseUrl = `${this.serverUrl}/player_api.php?username=${this.username}&password=${this.password}`;
  }

  private async makeRequest(url: string): Promise<any> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw new Error(`Failed to connect to Xtream server: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async authenticate(): Promise<XtreamUserInfo> {
    return this.makeRequest(this.baseUrl);
  }

  async getLiveCategories(): Promise<XtreamCategory[]> {
    const url = `${this.baseUrl}&action=get_live_categories`;
    return this.makeRequest(url);
  }

  async getLiveStreams(categoryId?: string): Promise<XtreamStream[]> {
    const url = categoryId 
      ? `${this.baseUrl}&action=get_live_streams&category_id=${categoryId}`
      : `${this.baseUrl}&action=get_live_streams`;
    return this.makeRequest(url);
  }

  async getVODCategories(): Promise<XtreamCategory[]> {
    const url = `${this.baseUrl}&action=get_vod_categories`;
    return this.makeRequest(url);
  }

  async getVODStreams(categoryId?: string): Promise<XtreamVOD[]> {
    const url = categoryId 
      ? `${this.baseUrl}&action=get_vod_streams&category_id=${categoryId}`
      : `${this.baseUrl}&action=get_vod_streams`;
    return this.makeRequest(url);
  }

  async getSeriesCategories(): Promise<XtreamCategory[]> {
    const url = `${this.baseUrl}&action=get_series_categories`;
    return this.makeRequest(url);
  }

  async getSeries(categoryId?: string): Promise<XtreamSeries[]> {
    const url = categoryId 
      ? `${this.baseUrl}&action=get_series&category_id=${categoryId}`
      : `${this.baseUrl}&action=get_series`;
    return this.makeRequest(url);
  }

  async getEPG(streamId: number): Promise<XtreamEPG[]> {
    const url = `${this.baseUrl}&action=get_short_epg&stream_id=${streamId}`;
    return this.makeRequest(url);
  }

  async getVODInfo(vodId: number): Promise<any> {
    const url = `${this.baseUrl}&action=get_vod_info&vod_id=${vodId}`;
    return this.makeRequest(url);
  }

  async getSeriesInfo(seriesId: number): Promise<any> {
    const url = `${this.baseUrl}&action=get_series_info&series_id=${seriesId}`;
    return this.makeRequest(url);
  }

  buildStreamUrl(streamId: number, type: 'live' | 'movie' | 'series', extension: string = 'ts'): string {
    if (type === 'live') {
      return `${this.serverUrl}/live/${this.username}/${this.password}/${streamId}.${extension}`;
    } else if (type === 'movie') {
      return `${this.serverUrl}/movie/${this.username}/${this.password}/${streamId}.mp4`;
    } else if (type === 'series') {
      return `${this.serverUrl}/series/${this.username}/${this.password}/${streamId}.mp4`;
    }
    return '';
  }

  buildM3UUrl(): string {
    return `${this.serverUrl}/get.php?username=${this.username}&password=${this.password}&type=m3u_plus&output=ts`;
  }
}
