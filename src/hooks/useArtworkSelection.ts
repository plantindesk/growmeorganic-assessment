
import { useCallback, useMemo, useReducer } from 'react';





export type SelectionMode = 'NONE' | 'EXPLICIT' | 'RANGE' | 'ALL';

export interface PageRow {
  id: string;
}

interface SelectionOverrides {
  includedIds: Set<string>;
  excludedIds: Set<string>;
  includedIndices: Set<number>;
  excludedIndices: Set<number>;
}

interface SelectionState {
  mode: SelectionMode;
  rangeCount: number;
  totalRecords: number;
  overrides: SelectionOverrides;
  indexToIdCache: Map<number, string>;
  idToIndexCache: Map<string, number>;
}

export interface SelectionDescriptor {
  mode: SelectionMode;
  rangeCount?: number;
  includedIds?: string[];
  excludedIds?: string[];
  excludedIndices?: number[];
}

export interface SelectionSummary {
  selectedCount: number;
  isAllSelected: boolean;
  isIndeterminate: boolean;
  isEmpty: boolean;
  descriptor: SelectionDescriptor;
}

export interface UseArtworkSelectionConfig {
  totalRecords: number;
  rowsPerPage: number;
}

export interface UseArtworkSelectionReturn<T extends PageRow = PageRow> {
  isRowSelected: (id: string, absoluteIndex: number) => boolean;
  onRowSelect: (id: string, absoluteIndex: number) => void;
  onSelectAllCurrentPage: (pageData: PageRow[], currentPage: number) => void;
  onBulkSelect: (count: number) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  selectionSummary: SelectionSummary;
  isCurrentPageFullySelected: (pageData: PageRow[], currentPage: number) => boolean;
  isCurrentPageIndeterminate: (pageData: PageRow[], currentPage: number) => boolean;
  getSelectionDescriptor: () => SelectionDescriptor;
  updateTotalRecords: (newTotal: number) => void;
  getSelectedRowsOnPage: (pageData: T[], currentPage: number) => T[];
}





type SelectionAction =
  | { type: 'TOGGLE_ROW'; payload: { id: string; absoluteIndex: number } }
  | { type: 'SELECT_ALL_PAGE'; payload: { rows: Array<{ id: string; absoluteIndex: number }> } }
  | { type: 'DESELECT_ALL_PAGE'; payload: { rows: Array<{ id: string; absoluteIndex: number }> } }
  | { type: 'BULK_SELECT'; payload: { count: number } }
  | { type: 'SELECT_ALL' }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'UPDATE_TOTAL_RECORDS'; payload: { total: number } }
  | { type: 'SYNC_PAGE_SELECTION'; payload: { rows: Array<{ id: string; absoluteIndex: number }>; selected: boolean } };





const createInitialState = (totalRecords: number): SelectionState => ({
  mode: 'NONE',
  rangeCount: 0,
  totalRecords,
  overrides: {
    includedIds: new Set(),
    excludedIds: new Set(),
    includedIndices: new Set(),
    excludedIndices: new Set(),
  },
  indexToIdCache: new Map(),
  idToIndexCache: new Map(),
});

const createFreshOverrides = (): SelectionOverrides => ({
  includedIds: new Set(),
  excludedIds: new Set(),
  includedIndices: new Set(),
  excludedIndices: new Set(),
});

const cloneOverrides = (overrides: SelectionOverrides): SelectionOverrides => ({
  includedIds: new Set(overrides.includedIds),
  excludedIds: new Set(overrides.excludedIds),
  includedIndices: new Set(overrides.includedIndices),
  excludedIndices: new Set(overrides.excludedIndices),
});

const wouldBaseModeSelect = (state: SelectionState, absoluteIndex: number): boolean => {
  switch (state.mode) {
    case 'ALL':
      return true;
    case 'RANGE':
      return absoluteIndex < state.rangeCount;
    case 'NONE':
    case 'EXPLICIT':
    default:
      return false;
  }
};

const checkIsRowSelected = (
  state: SelectionState,
  id: string,
  absoluteIndex: number
): boolean => {
  const { mode, rangeCount, overrides } = state;


  if (overrides.excludedIds.has(id)) return false;
  if (overrides.includedIds.has(id)) return true;
  if (overrides.excludedIndices.has(absoluteIndex)) return false;
  if (overrides.includedIndices.has(absoluteIndex)) return true;


  switch (mode) {
    case 'NONE':
      return false;
    case 'ALL':
      return true;
    case 'RANGE':
      return absoluteIndex < rangeCount;
    case 'EXPLICIT':
      return false;
    default:
      return false;
  }
};

const calculateSelectedCount = (state: SelectionState): number => {
  const { mode, rangeCount, totalRecords, overrides } = state;

  let baseCount: number;

  switch (mode) {
    case 'NONE':
      baseCount = 0;
      break;
    case 'ALL':
      baseCount = totalRecords;
      break;
    case 'RANGE':
      baseCount = Math.min(rangeCount, totalRecords);
      break;
    case 'EXPLICIT':
      baseCount = 0;
      break;
    default:
      baseCount = 0;
  }

  if (mode === 'EXPLICIT' || mode === 'NONE') {
    const includedIndices = new Set(overrides.includedIndices);
    overrides.includedIds.forEach((id) => {
      const index = state.idToIndexCache.get(id);
      if (index !== undefined) includedIndices.add(index);
    });

    let unknownIdCount = 0;
    overrides.includedIds.forEach((id) => {
      if (!state.idToIndexCache.has(id)) unknownIdCount++;
    });

    return includedIndices.size + unknownIdCount;
  }

  const excludedIndices = new Set(overrides.excludedIndices);
  overrides.excludedIds.forEach((id) => {
    const index = state.idToIndexCache.get(id);
    if (index !== undefined) excludedIndices.add(index);
  });

  let unknownExcludedCount = 0;
  overrides.excludedIds.forEach((id) => {
    if (!state.idToIndexCache.has(id)) unknownExcludedCount++;
  });

  let additionalInclusions = 0;
  overrides.includedIndices.forEach((index) => {
    if (!wouldBaseModeSelect(state, index)) additionalInclusions++;
  });

  overrides.includedIds.forEach((id) => {
    const index = state.idToIndexCache.get(id);
    if (index !== undefined && !wouldBaseModeSelect(state, index)) {
      additionalInclusions++;
    } else if (index === undefined) {
      additionalInclusions++;
    }
  });

  return Math.max(0, baseCount - excludedIndices.size - unknownExcludedCount + additionalInclusions);
};





const selectionReducer = (state: SelectionState, action: SelectionAction): SelectionState => {
  switch (action.type) {
    case 'TOGGLE_ROW': {
      const { id, absoluteIndex } = action.payload;
      const isCurrentlySelected = checkIsRowSelected(state, id, absoluteIndex);
      const newOverrides = cloneOverrides(state.overrides);

      const newIndexToIdCache = new Map(state.indexToIdCache);
      const newIdToIndexCache = new Map(state.idToIndexCache);
      newIndexToIdCache.set(absoluteIndex, id);
      newIdToIndexCache.set(id, absoluteIndex);

      if (isCurrentlySelected) {
        newOverrides.includedIds.delete(id);
        newOverrides.includedIndices.delete(absoluteIndex);

        if (wouldBaseModeSelect(state, absoluteIndex)) {
          newOverrides.excludedIds.add(id);
          newOverrides.excludedIndices.add(absoluteIndex);
        }
      } else {
        newOverrides.excludedIds.delete(id);
        newOverrides.excludedIndices.delete(absoluteIndex);

        if (!wouldBaseModeSelect(state, absoluteIndex)) {
          newOverrides.includedIds.add(id);
          newOverrides.includedIndices.add(absoluteIndex);
        }
      }

      let newMode = state.mode;
      if (state.mode === 'NONE' && !isCurrentlySelected) {
        newMode = 'EXPLICIT';
      }

      return {
        ...state,
        mode: newMode,
        overrides: newOverrides,
        indexToIdCache: newIndexToIdCache,
        idToIndexCache: newIdToIndexCache,
      };
    }

    case 'SELECT_ALL_PAGE': {
      const { rows } = action.payload;
      const newOverrides = cloneOverrides(state.overrides);
      const newIndexToIdCache = new Map(state.indexToIdCache);
      const newIdToIndexCache = new Map(state.idToIndexCache);

      rows.forEach(({ id, absoluteIndex }) => {
        newIndexToIdCache.set(absoluteIndex, id);
        newIdToIndexCache.set(id, absoluteIndex);
        newOverrides.excludedIds.delete(id);
        newOverrides.excludedIndices.delete(absoluteIndex);

        if (!wouldBaseModeSelect(state, absoluteIndex)) {
          newOverrides.includedIds.add(id);
          newOverrides.includedIndices.add(absoluteIndex);
        }
      });

      let newMode = state.mode;
      if (state.mode === 'NONE') newMode = 'EXPLICIT';

      return {
        ...state,
        mode: newMode,
        overrides: newOverrides,
        indexToIdCache: newIndexToIdCache,
        idToIndexCache: newIdToIndexCache,
      };
    }

    case 'DESELECT_ALL_PAGE': {
      const { rows } = action.payload;
      const newOverrides = cloneOverrides(state.overrides);
      const newIndexToIdCache = new Map(state.indexToIdCache);
      const newIdToIndexCache = new Map(state.idToIndexCache);

      rows.forEach(({ id, absoluteIndex }) => {
        newIndexToIdCache.set(absoluteIndex, id);
        newIdToIndexCache.set(id, absoluteIndex);
        newOverrides.includedIds.delete(id);
        newOverrides.includedIndices.delete(absoluteIndex);

        if (wouldBaseModeSelect(state, absoluteIndex)) {
          newOverrides.excludedIds.add(id);
          newOverrides.excludedIndices.add(absoluteIndex);
        }
      });

      return {
        ...state,
        overrides: newOverrides,
        indexToIdCache: newIndexToIdCache,
        idToIndexCache: newIdToIndexCache,
      };
    }

    case 'BULK_SELECT': {
      const { count } = action.payload;
      const clampedCount = Math.min(Math.max(0, count), state.totalRecords);

      if (clampedCount === 0) {
        return {
          ...state,
          mode: 'NONE',
          rangeCount: 0,
          overrides: createFreshOverrides(),
        };
      }

      return {
        ...state,
        mode: 'RANGE',
        rangeCount: clampedCount,
        overrides: createFreshOverrides(),
      };
    }

    case 'SELECT_ALL': {
      return {
        ...state,
        mode: 'ALL',
        rangeCount: state.totalRecords,
        overrides: createFreshOverrides(),
      };
    }

    case 'CLEAR_SELECTION': {
      return {
        ...state,
        mode: 'NONE',
        rangeCount: 0,
        overrides: createFreshOverrides(),
      };
    }

    case 'UPDATE_TOTAL_RECORDS': {
      const { total } = action.payload;
      const newRangeCount = state.mode === 'RANGE'
        ? Math.min(state.rangeCount, total)
        : state.rangeCount;

      return {
        ...state,
        totalRecords: total,
        rangeCount: newRangeCount,
      };
    }

    case 'SYNC_PAGE_SELECTION': {
      const { rows, selected } = action.payload;
      const newOverrides = cloneOverrides(state.overrides);
      const newIndexToIdCache = new Map(state.indexToIdCache);
      const newIdToIndexCache = new Map(state.idToIndexCache);

      rows.forEach(({ id, absoluteIndex }) => {
        newIndexToIdCache.set(absoluteIndex, id);
        newIdToIndexCache.set(id, absoluteIndex);

        if (selected) {
          newOverrides.excludedIds.delete(id);
          newOverrides.excludedIndices.delete(absoluteIndex);
          if (!wouldBaseModeSelect(state, absoluteIndex)) {
            newOverrides.includedIds.add(id);
            newOverrides.includedIndices.add(absoluteIndex);
          }
        } else {
          newOverrides.includedIds.delete(id);
          newOverrides.includedIndices.delete(absoluteIndex);
          if (wouldBaseModeSelect(state, absoluteIndex)) {
            newOverrides.excludedIds.add(id);
            newOverrides.excludedIndices.add(absoluteIndex);
          }
        }
      });

      let newMode = state.mode;
      if (state.mode === 'NONE' && selected) newMode = 'EXPLICIT';

      return {
        ...state,
        mode: newMode,
        overrides: newOverrides,
        indexToIdCache: newIndexToIdCache,
        idToIndexCache: newIdToIndexCache,
      };
    }

    default:
      return state;
  }
};





export const useArtworkSelection = <T extends PageRow = PageRow>({
  totalRecords,
  rowsPerPage,
}: UseArtworkSelectionConfig): UseArtworkSelectionReturn<T> => {
  const [state, dispatch] = useReducer(selectionReducer, totalRecords, createInitialState);

  const isRowSelected = useCallback(
    (id: string, absoluteIndex: number): boolean => {
      return checkIsRowSelected(state, id, absoluteIndex);
    },
    [state]
  );

  const onRowSelect = useCallback((id: string, absoluteIndex: number): void => {
    dispatch({ type: 'TOGGLE_ROW', payload: { id, absoluteIndex } });
  }, []);

  const onSelectAllCurrentPage = useCallback(
    (pageData: PageRow[], currentPage: number): void => {
      const rowsWithIndices = pageData.map((row, localIndex) => ({
        id: row.id,
        absoluteIndex: currentPage * rowsPerPage + localIndex,
      }));

      const allSelected = rowsWithIndices.every(({ id, absoluteIndex }) =>
        checkIsRowSelected(state, id, absoluteIndex)
      );

      if (allSelected) {
        dispatch({ type: 'DESELECT_ALL_PAGE', payload: { rows: rowsWithIndices } });
      } else {
        dispatch({ type: 'SELECT_ALL_PAGE', payload: { rows: rowsWithIndices } });
      }
    },
    [state, rowsPerPage]
  );

  const onBulkSelect = useCallback((count: number): void => {
    dispatch({ type: 'BULK_SELECT', payload: { count } });
  }, []);

  const onSelectAll = useCallback((): void => {
    dispatch({ type: 'SELECT_ALL' });
  }, []);

  const onClearSelection = useCallback((): void => {
    dispatch({ type: 'CLEAR_SELECTION' });
  }, []);

  const updateTotalRecords = useCallback((newTotal: number): void => {
    dispatch({ type: 'UPDATE_TOTAL_RECORDS', payload: { total: newTotal } });
  }, []);

  const isCurrentPageFullySelected = useCallback(
    (pageData: PageRow[], currentPage: number): boolean => {
      if (pageData.length === 0) return false;
      return pageData.every((row, localIndex) => {
        const absoluteIndex = currentPage * rowsPerPage + localIndex;
        return checkIsRowSelected(state, row.id, absoluteIndex);
      });
    },
    [state, rowsPerPage]
  );

  const isCurrentPageIndeterminate = useCallback(
    (pageData: PageRow[], currentPage: number): boolean => {
      if (pageData.length === 0) return false;
      const selectionStates = pageData.map((row, localIndex) => {
        const absoluteIndex = currentPage * rowsPerPage + localIndex;
        return checkIsRowSelected(state, row.id, absoluteIndex);
      });
      const someSelected = selectionStates.some(Boolean);
      const allSelected = selectionStates.every(Boolean);
      return someSelected && !allSelected;
    },
    [state, rowsPerPage]
  );

  const getSelectionDescriptor = useCallback((): SelectionDescriptor => {
    const { mode, rangeCount, overrides } = state;
    const descriptor: SelectionDescriptor = { mode };

    switch (mode) {
      case 'RANGE':
        descriptor.rangeCount = rangeCount;
        if (overrides.excludedIds.size > 0) {
          descriptor.excludedIds = Array.from(overrides.excludedIds);
        }
        if (overrides.excludedIndices.size > 0) {
          descriptor.excludedIndices = Array.from(overrides.excludedIndices);
        }
        break;
      case 'ALL':
        if (overrides.excludedIds.size > 0) {
          descriptor.excludedIds = Array.from(overrides.excludedIds);
        }
        break;
      case 'EXPLICIT':
        descriptor.includedIds = Array.from(overrides.includedIds);
        break;
    }

    return descriptor;
  }, [state]);

  const getSelectedRowsOnPage = useCallback(
    (pageData: T[], currentPage: number): T[] => {
      return pageData.filter((row, localIndex) => {
        const absoluteIndex = currentPage * rowsPerPage + localIndex;
        return checkIsRowSelected(state, row.id, absoluteIndex);
      });
    },
    [state, rowsPerPage]
  );

  const selectionSummary = useMemo((): SelectionSummary => {
    const selectedCount = calculateSelectedCount(state);
    const isAllSelected = selectedCount === state.totalRecords && state.totalRecords > 0;
    const isEmpty = selectedCount === 0;
    const isIndeterminate = !isEmpty && !isAllSelected;

    return {
      selectedCount,
      isAllSelected,
      isIndeterminate,
      isEmpty,
      descriptor: getSelectionDescriptor(),
    };
  }, [state, getSelectionDescriptor]);

  return {
    isRowSelected,
    onRowSelect,
    onSelectAllCurrentPage,
    onBulkSelect,
    onSelectAll,
    onClearSelection,
    selectionSummary,
    isCurrentPageFullySelected,
    isCurrentPageIndeterminate,
    getSelectionDescriptor,
    updateTotalRecords,
    getSelectedRowsOnPage,
  };
};

export default useArtworkSelection;
