import React, { useRef, useCallback } from 'react';
import {
  DataTable,
  type DataTablePageEvent,
  type DataTableSelectionMultipleChangeEvent,
} from 'primereact/datatable';
import { Column } from 'primereact/column';
import { OverlayPanel } from 'primereact/overlaypanel';
import { InputNumber } from 'primereact/inputnumber';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { ProgressSpinner } from 'primereact/progressspinner';
import { useArtworkData } from '../hooks/useArtworkData';
import { useArtworkSelection } from '../hooks/useArtworkSelection';
import { type Artwork } from '../utils/types';

const ROWS_PER_PAGE = 12;

const ArtworkTable: React.FC = () => {
  const {
    artworks,
    loading,
    error,
    totalRecords,
    currentPage,
    onPageChange,
    retry,
  } = useArtworkData({ rowsPerPage: ROWS_PER_PAGE });

  const {
    isRowSelected,
    onRowSelect,
    onSelectAllCurrentPage,
    onBulkSelect,
    onClearSelection,
    selectionSummary,
    isCurrentPageFullySelected,
    isCurrentPageIndeterminate,
    updateTotalRecords,
    getSelectedRowsOnPage,
  } = useArtworkSelection({
    totalRecords,
    rowsPerPage: ROWS_PER_PAGE,
  });

  const overlayPanelRef = useRef<OverlayPanel>(null);
  const [bulkSelectValue, setBulkSelectValue] = React.useState<number | null>(null);

  // Sync total records with selection hook when it changes
  React.useEffect(() => {
    updateTotalRecords(totalRecords);
  }, [totalRecords, updateTotalRecords]);

  const handlePageChange = useCallback(
    (event: DataTablePageEvent) => {
      const newPage = Math.floor((event.first ?? 0) / ROWS_PER_PAGE);
      onPageChange(newPage);
    },
    [onPageChange]
  );

  const handleBulkSelectSubmit = useCallback(() => {
    if (bulkSelectValue !== null && bulkSelectValue >= 0) {
      onBulkSelect(bulkSelectValue);
      overlayPanelRef.current?.hide();
      setBulkSelectValue(null);
    }
  }, [bulkSelectValue, onBulkSelect]);

  const handleSelectionChange = useCallback(
    (e: DataTableSelectionMultipleChangeEvent<Artwork[]>) => {
      const newSelection = e.value as Artwork[];
      const currentSelection = getSelectedRowsOnPage(artworks, currentPage);
      const currentIds = new Set(currentSelection.map((r) => r.id));
      const newIds = new Set(newSelection.map((r) => r.id));

      artworks.forEach((artwork, localIndex) => {
        const absoluteIndex = currentPage * ROWS_PER_PAGE + localIndex;
        const wasSelected = currentIds.has(artwork.id);
        const isNowSelected = newIds.has(artwork.id);

        if (wasSelected !== isNowSelected) {
          onRowSelect(artwork.id, absoluteIndex);
        }
      });
    },
    [artworks, currentPage, getSelectedRowsOnPage, onRowSelect]
  );

  const handleHeaderCheckboxChange = useCallback(() => {
    onSelectAllCurrentPage(artworks, currentPage);
  }, [artworks, currentPage, onSelectAllCurrentPage]);

  const headerCheckboxTemplate = () => {
    const isAllSelected = isCurrentPageFullySelected(artworks, currentPage);
    const isIndeterminate = isCurrentPageIndeterminate(artworks, currentPage);

    return (
      <div className="!flex flex-row items-center justify-center gap-1" style={{ display: 'flex' }}>
        <div className="relative">
          <Checkbox
            checked={isAllSelected}
            onChange={handleHeaderCheckboxChange}
            className={isIndeterminate ? 'indeterminate' : ''}
          />
          {isIndeterminate && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-2 h-0.5 bg-indigo-600 rounded" />
            </div>
          )}
        </div>
        <Button
          icon="pi pi-chevron-down"
          className="p-button-text p-button-sm p-1! w-6! h-6! text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
          onClick={(e) => overlayPanelRef.current?.toggle(e)}
          aria-label="Bulk select options"
          style={{ height: '1.5rem', width: '1.5rem' }}
        />
      </div>
    );
  };

  const rowCheckboxTemplate = (rowData: Artwork, options: { rowIndex: number }) => {
    const absoluteIndex = currentPage * ROWS_PER_PAGE + options.rowIndex;
    const selected = isRowSelected(rowData.id, absoluteIndex);

    return (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={selected}
          onChange={() => onRowSelect(rowData.id, absoluteIndex)}
        />
      </div>
    );
  };

  const titleTemplate = (rowData: Artwork) => (
    <div className="font-medium text-gray-900 truncate max-w-xs" title={rowData.title}>
      {rowData.title}
    </div>
  );

  const placeOfOriginTemplate = (rowData: Artwork) => (
    <div className="text-gray-600 text-sm">{rowData.placeOfOrigin}</div>
  );

  const artistTemplate = (rowData: Artwork) => (
    <div className="text-gray-700 text-sm truncate max-w-xs" title={rowData.artistDisplay}>
      {rowData.artists.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {rowData.artists.slice(0, 2).map((artist, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700"
            >
              {artist}
            </span>
          ))}
          {rowData.artists.length > 2 && (
            <span className="text-gray-400 text-xs">
              +{rowData.artists.length - 2} more
            </span>
          )}
        </div>
      ) : (
        <span className="text-gray-400 italic">Unknown Artist</span>
      )}
    </div>
  );

  const inscriptionsTemplate = (rowData: Artwork) => (
    <div className="text-gray-600 text-sm truncate max-w-xs" title={rowData.inscriptions}>
      {rowData.inscriptions.length > 80
        ? `${rowData.inscriptions.substring(0, 80)}...`
        : rowData.inscriptions}
    </div>
  );

  const dateStartTemplate = (rowData: Artwork) => (
    <div className="text-gray-600 text-sm font-mono">{rowData.dateStart}</div>
  );

  const dateEndTemplate = (rowData: Artwork) => (
    <div className="text-gray-600 text-sm font-mono">{rowData.dateEnd}</div>
  );

  return (
    <div className="bg-white rounded-xl shadow-lg m-4 overflow-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 border-b border-gray-200 bg-linear-to-r from-gray-50 to-white">
        <div className="flex items-baseline gap-3">
          <h2 className="text-xl font-semibold text-gray-900">
            Art Institute of Chicago Collection
          </h2>
          <span className="text-sm text-gray-500">
            {totalRecords.toLocaleString()} artworks
          </span>
        </div>
        <div className="flex items-center gap-3">
          {!selectionSummary.isEmpty && (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
                <i className="pi pi-check-circle text-xs" />
                {selectionSummary.selectedCount.toLocaleString()} selected
              </span>
              <button
                onClick={onClearSelection}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                aria-label="Clear selection"
              >
                <i className="pi pi-times text-sm" />
              </button>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 px-6 py-4 bg-red-50 border-b border-red-200">
          <i className="pi pi-exclamation-triangle text-red-500 text-lg" />
          <span className="flex-1 text-red-700">{error}</span>
          <Button
            label="Retry"
            icon="pi pi-refresh"
            className="p-button-sm p-button-outlined p-button-danger"
            onClick={retry}
          />
        </div>
      )}

      <DataTable
        value={artworks}
        lazy
        paginator
        first={currentPage * ROWS_PER_PAGE}
        rows={ROWS_PER_PAGE}
        totalRecords={totalRecords}
        onPage={handlePageChange}
        loading={loading}
        loadingIcon={
          <div className="flex items-center justify-center p-8">
            <ProgressSpinner
              style={{ width: '40px', height: '40px' }}
              strokeWidth="4"
            />
          </div>
        }
        selection={getSelectedRowsOnPage(artworks, currentPage)}
        onSelectionChange={handleSelectionChange}
        selectionMode="multiple"
        dataKey="id"
        tableStyle={{ minWidth: '60rem' }}
        className="artwork-datatable"
        emptyMessage={
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <i className="pi pi-inbox text-4xl mb-3 text-gray-300" />
            <span>No artworks found</span>
          </div>
        }
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport"
        currentPageReportTemplate="Showing {first} to {last} of {totalRecords} artworks"
        paginatorClassName="border-t border-gray-200 bg-gray-50 px-4 py-3"
        rowClassName={(data: Artwork) => {
          const localIndex = artworks.findIndex((a) => a.id === data.id);
          const absoluteIndex = localIndex + currentPage * ROWS_PER_PAGE;
          return isRowSelected(data.id, absoluteIndex)
            ? 'bg-indigo-50 hover:bg-indigo-100'
            : 'hover:bg-gray-50';
        }}
        pt={{
          headerRow: { className: 'bg-gray-50' },
          tbody: { className: 'border-b border-gray-100 transition-colors' },
        }}
      >
        <Column
          header={headerCheckboxTemplate}
          body={rowCheckboxTemplate}
          style={{ width: '4rem' }}
          headerClassName="!text-center !block"
          bodyClassName="!text-center"
        />
        <Column
          field="title"
          header="Title"
          body={titleTemplate}
          style={{ minWidth: '200px' }}
        />
        <Column
          field="placeOfOrigin"
          header="Place of Origin"
          body={placeOfOriginTemplate}
          style={{ minWidth: '130px' }}
        />
        <Column
          field="artistDisplay"
          header="Artist"
          body={artistTemplate}
          style={{ minWidth: '200px' }}
        />
        <Column
          field="inscriptions"
          header="Inscriptions"
          body={inscriptionsTemplate}
          style={{ minWidth: '200px' }}
        />
        <Column
          field="dateStart"
          header="Date Start"
          body={dateStartTemplate}
          style={{ width: '100px' }}
        />
        <Column
          field="dateEnd"
          header="Date End"
          body={dateEndTemplate}
          style={{ width: '100px' }}
        />
      </DataTable>

      <OverlayPanel
        ref={overlayPanelRef}
        className="shadow-xl border border-gray-200 rounded-lg"
        dismissable
      >
        <div className="w-80 p-4">
          <div className="mb-4">
            <h4 className="text-base font-semibold text-gray-900 mb-1">
              Bulk Selection
            </h4>
            <p className="text-sm text-gray-500">
              Select the first N rows across all pages
            </p>
          </div>
          <div className="mb-3">
            <InputNumber
              value={bulkSelectValue}
              onValueChange={(e) => setBulkSelectValue(e.value ?? null)}
              min={0}
              max={totalRecords}
              placeholder="Enter number of rows..."
              className="w-full"
              inputClassName="w-full text-center font-medium"
              showButtons
              buttonLayout="horizontal"
              incrementButtonIcon="pi pi-plus"
              decrementButtonIcon="pi pi-minus"
              incrementButtonClassName="bg-gray-100 hover:bg-gray-200 border-gray-300"
              decrementButtonClassName="bg-gray-100 hover:bg-gray-200 border-gray-300"
            />
          </div>
          <div className="flex justify-end gap-2 mb-4 pb-4 border-b border-gray-200" style={{ display: 'flex', flexDirection: 'row', gap: '1rem', marginTop: '1rem' }}>
            <Button
              onClick={() => {
                overlayPanelRef.current?.hide();
                setBulkSelectValue(null);
              }}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkSelectSubmit}
              disabled={bulkSelectValue === null || bulkSelectValue < 0}
              className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-md transition-colors flex items-center gap-1.5"
            >
              <i className="pi pi-check text-xs" />
              Select Rows
            </Button>
          </div>
        </div>
      </OverlayPanel>

      {!selectionSummary.isEmpty && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 px-6 py-4 bg-linear-to-r from-indigo-600 to-purple-600 text-white">
          <div className="flex items-center gap-3 flex-wrap justify-center sm:justify-start">
            <i className="pi pi-check-circle text-lg" />
            <span>
              <strong>{selectionSummary.selectedCount.toLocaleString()}</strong> of{' '}
              <strong>{totalRecords.toLocaleString()}</strong> artworks selected
            </span>
            {selectionSummary.descriptor.mode === 'RANGE' && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-400 text-yellow-900">
                First {selectionSummary.descriptor.rangeCount} rows
              </span>
            )}
            {selectionSummary.descriptor.mode === 'ALL' && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-400 text-green-900">
                All selected
              </span>
            )}
          </div>
          <button
            onClick={onClearSelection}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white border border-white/50 hover:bg-white/20 rounded-md transition-colors"
          >
            <i className="pi pi-times text-xs" />
            Clear All
          </button>
        </div>
      )}
    </div>
  );
};

export default ArtworkTable;
