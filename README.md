# Art Institute of Chicago Artwork Viewer

A React-based web application that displays artworks from the Art Institute of Chicago collection with advanced selection capabilities, including individual row selection, bulk selection, and multi-page selection management.

## Features

- **Artwork Display**: Browse artworks from the Art Institute of Chicago API with pagination
- **Row Selection**: Individual row selection with checkboxes
- **Bulk Selection**: Select the first N rows across all pages using an intuitive input interface
- **Selection Modes**: Supports EXPLICIT, RANGE, ALL, and NONE selection modes
- **Selection Persistence**: Maintains selection state across page navigation
- **Responsive Design**: Clean, modern UI built with Tailwind CSS
- **Error Handling**: Robust error handling with retry functionality
- **Loading States**: Smooth loading indicators using PrimeReact components

## Tech Stack

- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 7
- **Styling**: Tailwind CSS 4
- **UI Components**: PrimeReact 10 with PrimeIcons
- **State Management**: React Hooks (useReducer, useCallback, useMemo)
- **API**: Art Institute of Chicago Public API

## Prerequisites

- Node.js 18+ (LTS recommended)
- npm or yarn

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd growmeorganic-assessment
```

2. Install dependencies:

```bash
npm install
```

## Configuration

This project uses the public Art Institute of Chicago API, which requires no authentication or API keys. Environment variables are not required for basic operation.

## Usage

### Development

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Production Build

Build the application for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

### Linting

Run ESLint to check for code quality issues:

```bash
npm run lint
```

## Project Structure

```
src/
├── components/
│   └── ArtworkTable.tsx    # Main data table component with selection UI
├── hooks/
│   ├── useArtworkData.ts   # Custom hook for fetching and managing artwork data
│   └── useArtworkSelection.ts # Custom hook for managing row selection state
├── services/
│   └── artworkService.ts   # API service for fetching artworks
├── utils/
│   └── types.ts            # TypeScript type definitions and utilities
├── App.tsx                 # Root application component
├── main.tsx                # Application entry point
└── index.css               # Global styles with Tailwind CSS
```

## API Reference

The application uses the [Art Institute of Chicago API](https://api.artic.edu/docs/).

### Endpoints

- `GET https://api.artic.edu/api/v1/artworks`
  - Fetches artworks with pagination
  - Parameters: `page`, `limit`, `fields`

### Data Fields

The application retrieves the following fields:
- `id` - Unique artwork identifier
- `title` - Artwork title
- `place_of_origin` - Origin location
- `artist_titles` - List of artist names
- `inscriptions` - Any inscriptions on the artwork
- `date_start` - Start date
- `date_end` - End date

## Selection Modes

The application supports four selection modes:

1. **NONE**: No rows selected
2. **EXPLICIT**: Individual row selection via checkboxes
3. **RANGE**: First N rows selected (bulk selection)
4. **ALL**: All available rows selected

Selection overrides allow users to:
- Deselect rows in ALL mode
- Select additional rows in RANGE mode

## License

Private project - All rights reserved.
