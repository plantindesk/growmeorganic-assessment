import React from 'react';
import ArtworkTable from './components/ArtworkTable';
// PrimeReact imports
import 'primereact/resources/themes/lara-light-indigo/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
const App: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <main className="flex-1 w-full max-w-7xl mx-auto py-4">
        <ArtworkTable />
      </main>
    </div>
  );
};
export default App;
