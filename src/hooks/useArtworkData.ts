import { useState, useEffect, useCallback } from 'react';
import { type Artwork, transformArtwork } from '../utils/types';
import { fetchArtworks, ArtworkServiceError } from '../services/artworkService';

const DEFAULT_ROWS_PER_PAGE = 12;

export interface UseArtworkDataConfig {
  rowsPerPage?: number;
}

export interface UseArtworkDataState {
  artworks: Artwork[];
  loading: boolean;
  error: string | null;
  totalRecords: number;
  currentPage: number;
}

export interface UseArtworkDataActions {
  onPageChange: (newPage: number) => void;
  retry: () => void;
}

export interface UseArtworkDataReturn extends UseArtworkDataState, UseArtworkDataActions {
  rowsPerPage: number;
}

export function useArtworkData(
  config: UseArtworkDataConfig = {}
): UseArtworkDataReturn {
  const { rowsPerPage = DEFAULT_ROWS_PER_PAGE } = config;

  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [retryCount, setRetryCount] = useState<number>(0);

  const onPageChange = useCallback((newPage: number): void => {
    if (newPage < 0) {
      return;
    }
    setCurrentPage(newPage);
  }, []);

  const retry = useCallback((): void => {
    setRetryCount((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const loadArtworks = async (): Promise<void> => {
      setLoading(true);
      setError(null);

      try {
        // API uses 1-based pagination, our state uses 0-based
        const apiPage = currentPage + 1;

        const response = await fetchArtworks({
          page: apiPage,
          limit: rowsPerPage,
        });

        if (isCancelled) {
          return;
        }

        const transformedArtworks = response.data.map(transformArtwork);

        setArtworks(transformedArtworks);
        setTotalRecords(response.pagination.total);
      } catch (err) {
        if (isCancelled) {
          return;
        }

        let errorMessage: string;

        if (err instanceof ArtworkServiceError) {
          errorMessage = err.message;
        } else if (err instanceof Error) {
          errorMessage = err.message;
        } else {
          errorMessage = 'An unexpected error occurred while fetching artworks';
        }

        setError(errorMessage);
        setArtworks([]);
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    loadArtworks();

    return () => {
      isCancelled = true;
    };
  }, [currentPage, rowsPerPage, retryCount]);

  return {
    artworks,
    loading,
    error,
    totalRecords,
    currentPage,
    rowsPerPage,
    onPageChange,
    retry,
  };
}

export default useArtworkData;
