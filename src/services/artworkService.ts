import type { ArtworkAPIResponse } from '../utils/types';

const API_BASE_URL = 'https://api.artic.edu/api/v1/artworks';

const API_FIELDS = [
  'id',
  'title',
  'place_of_origin',
  'artist_titles',
  'inscriptions',
  'date_start',
  'date_end',
] as const;

export interface FetchArtworksParams {
  page: number;
  limit: number;
}

export class ArtworkServiceError extends Error {
  statusCode?: number;
  cause?: unknown;

  constructor(
    message: string,
    statusCode?: number,
    cause?: unknown
  ) {
    super(message);
    this.name = 'ArtworkServiceError';
    this.statusCode = statusCode;
    this.cause = cause;
  }
}

export async function fetchArtworks({
  page,
  limit,
}: FetchArtworksParams): Promise<ArtworkAPIResponse> {
  if (page < 1) {
    throw new ArtworkServiceError('Page number must be at least 1');
  }

  if (limit < 1 || limit > 100) {
    throw new ArtworkServiceError('Limit must be between 1 and 100');
  }

  const url = new URL(API_BASE_URL);
  url.searchParams.set('page', String(page));
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('fields', API_FIELDS.join(','));

  let response: Response;

  try {
    response = await fetch(url.toString());
  } catch (error) {
    throw new ArtworkServiceError(
      'Network error: Unable to connect to the Art Institute of Chicago API',
      undefined,
      error
    );
  }

  if (!response.ok) {
    const statusText = response.statusText || 'Unknown error';

    switch (response.status) {
      case 400:
        throw new ArtworkServiceError(
          `Bad Request: Invalid parameters sent to API`,
          response.status
        );
      case 404:
        throw new ArtworkServiceError(
          `Not Found: The requested resource does not exist`,
          response.status
        );
      case 429:
        throw new ArtworkServiceError(
          `Rate Limited: Too many requests. Please try again later`,
          response.status
        );
      case 500:
      case 502:
      case 503:
      case 504:
        throw new ArtworkServiceError(
          `Server Error: The Art Institute of Chicago API is temporarily unavailable`,
          response.status
        );
      default:
        throw new ArtworkServiceError(
          `API Error: ${response.status} ${statusText}`,
          response.status
        );
    }
  }

  let data: ArtworkAPIResponse;

  try {
    data = await response.json();
  } catch (error) {
    throw new ArtworkServiceError(
      'Parse Error: Failed to parse API response as JSON',
      undefined,
      error
    );
  }

  if (!data || !data.data || !data.pagination) {
    throw new ArtworkServiceError(
      'Invalid Response: API response does not match expected format'
    );
  }

  return data;
}
