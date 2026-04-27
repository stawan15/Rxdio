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
      return data.filter((s: RadioStation) => s.name && s.url_resolved).slice(0, 50); // เอาแค่ 50 อันดับแรกพอ เดี๋ยวค้าง
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

  // ดึงสถานีตาม Station UUIDs (สำหรับ Favorites)
  getStationsByUuids: async (uuids: string[]): Promise<RadioStation[]> => {
    if (uuids.length === 0) return [];
    try {
      const response = await fetch(`${BASE_URL}/stations/byuuid?uuids=${uuids.join(',')}`);
      if (!response.ok) throw new Error('Network response was not ok');
      return await response.json();
    } catch (error) {
      console.error('Error fetching stations by uuids:', error);
      return [];
    }
  }
};
