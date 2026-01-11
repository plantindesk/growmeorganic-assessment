
export interface ArtworkAPIResponse {
  pagination: {
    total: number;
    limit: number;
    offset: number;
    total_pages: number;
    current_page: number;
  };
  data: ArtworkData[];
}

export interface ArtworkData {
  id: number;
  title: string;
  place_of_origin: string | null;
  artist_titles: string[];
  inscriptions: string | null;
  date_start: number | null;
  date_end: number | null;
}

export interface Artwork {
  id: string;
  title: string;
  placeOfOrigin: string;
  artists: string[];
  artistDisplay: string;
  inscriptions: string;
  dateStart: string;
  dateEnd: string;
}

export const transformArtwork = (data: ArtworkData): Artwork => ({
  id: String(data.id),
  title: data.title || 'Untitled',
  placeOfOrigin: data.place_of_origin || 'Unknown',
  artists: data.artist_titles || [],
  artistDisplay: data.artist_titles?.length
    ? data.artist_titles.join(', ')
    : 'Unknown Artist',
  inscriptions: data.inscriptions || '—',
  dateStart: data.date_start !== null ? String(data.date_start) : '—',
  dateEnd: data.date_end !== null ? String(data.date_end) : '—',
});
