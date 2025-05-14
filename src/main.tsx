
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './lib/performance.css'

const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error("Failed to find the root element");
  document.body.innerHTML = '<div>Failed to initialize the application. Please reload the page.</div>';
} else {
  const root = createRoot(rootElement);
  
  try {
    root.render(<App />);
  } catch (error) {
    console.error("Failed to render the app:", error);
    root.render(
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h2 className="text-xl font-bold mb-2">Failed to initialize the application</h2>
        <p className="mb-4">Please reload the page or try again later.</p>
        <button 
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600" 
          onClick={() => window.location.reload()}
        >
          Reload
        </button>
      </div>
    );
  }
}
