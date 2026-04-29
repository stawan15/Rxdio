export interface RadioStation {
  changeid: string;
  stationuuid: string;
  name: string;
  url: string;
  url_resolved: string;
  homepage: string;
  favicon: string;
  tags: string;
  country: string;
  votes: number;
  codec: string;
  bitrate: number;
  lastcheckok: number;
}

const BASE_URL = 'https://de1.api.radio-browser.info/json';

export const radioApi = {
  // ดึงรายชื่อประเทศทั้งหมดที่มีสถานีวิทยุ
  getCountries: async (): Promise<{ name: string; stationcount: number }[]> => {
    try {
      const response = await fetch(`${BASE_URL}/countries`);
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      return data.sort((a: any, b: any) => b.stationcount - a.stationcount);
    } catch (error) {
      console.error('Error fetching countries:', error);
      return [];
    }
  },

  // ดึงรายชื่อสถานีตามประเทศ
  getStationsByCountry: async (country: string): Promise<RadioStation[]> => {
    try {
      const response = await fetch(`${BASE_URL}/stations/bycountry/${country.toLowerCase()}`);
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      let stations = data.filter((s: RadioStation) => s.name && s.url_resolved).slice(0, 50);

      // Inject EFM 94 for Thailand manually because it's missing from the global API
      if (country.toLowerCase() === 'thailand') {
        stations.unshift({
          changeid: "custom-efm94",
          stationuuid: "custom-efm94-uuid-1",
          name: "EFM 94",
          url: "https://live.atimemedia.com/efm/live.m3u8",
          url_resolved: "https://live.atimemedia.com/efm/live.m3u8",
          homepage: "https://atime.live/efm",
          favicon: "https://atime.live/images/v2/logo_efm.png",
          tags: "pop,thailand",
          country: "Thailand",
          votes: 9999,
          codec: "HLS",
          bitrate: 128,
          lastcheckok: 1
        } as any);
      }

      return stations;
    } catch (error) {
      console.error('Error fetching stations:', error);
      return [];
    }
  },

  // สุ่มสถานีจากทั่วโลก
  getRandomStation: async (): Promise<RadioStation | null> => {
    try {
      const response = await fetch(`${BASE_URL}/stations/lastclick/100`);
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      const randomIndex = Math.floor(Math.random() * data.length);
      return data[randomIndex];
    } catch (error) {
      console.error('Error fetching random station:', error);
      return null;
    }
  },

  getStationsByUuids: async (uuids: string[]): Promise<RadioStation[]> => {
    if (uuids.length === 0) return [];
    try {
      const customUuids = uuids.filter(id => id.startsWith('custom-'));
      const apiUuids = uuids.filter(id => !id.startsWith('custom-'));
      
      let results: RadioStation[] = [];
      
      if (apiUuids.length > 0) {
        const response = await fetch(`${BASE_URL}/stations/byuuid?uuids=${apiUuids.join(',')}`);
        if (!response.ok) throw new Error('Network response was not ok');
        results = await response.json();
      }

      // Add back custom stations if they were requested
      if (customUuids.includes('custom-efm94-uuid-1')) {
        results.push({
          changeid: "custom-efm94",
          stationuuid: "custom-efm94-uuid-1",
          name: "EFM 94",
          url: "https://live.atimemedia.com/efm/live.m3u8",
          url_resolved: "https://live.atimemedia.com/efm/live.m3u8",
          homepage: "https://atime.live/efm",
          favicon: "https://atime.live/images/v2/logo_efm.png",
          tags: "pop,thailand",
          country: "Thailand",
          votes: 9999,
          codec: "HLS",
          bitrate: 128,
          lastcheckok: 1
        } as any);
      }

      return results;
    } catch (error) {
      console.error('Error fetching stations by uuids:', error);
      return [];
    }
  }
};
