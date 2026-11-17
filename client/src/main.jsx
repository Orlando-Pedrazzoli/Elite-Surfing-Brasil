// client/src/main.jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { AppContextProvider } from './context/AppContext.jsx'
import { CategoriesProvider } from './context/CategoriesContext.jsx'
import App from './App.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <AppContextProvider>
          <CategoriesProvider>
            <App />
          </CategoriesProvider>
        </AppContextProvider>
      </BrowserRouter>
    </HelmetProvider>
  </StrictMode>,
)