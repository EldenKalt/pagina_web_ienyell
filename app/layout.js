import '../styles/globals.css';
import '../styles/admin.css';
import SiteChrome from '../components/SiteChrome';
import { OffcanvasProvider } from '../components/OffcanvasContext';
import { AuthProvider } from '../context/AuthContext';
import { WizardProvider } from '../context/WizardContext';
import { CalculatorSettingsProvider } from '../context/CalculatorSettingsContext';
import { ServiceCatalogProvider } from '../context/ServiceCatalogContext';
import { LinkButtonVisibilityProvider } from '../context/LinkButtonVisibilityContext';
import WizardModal from '../components/wizard/WizardModal';

export const metadata = {
  title: 'enyell — Creative Universe',
  description: 'Illustrator and creative artist portfolio',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        {/* Serif used ONLY for the article body (.blog-content) on /blog/[slug]. */}
        <link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&display=swap" rel="stylesheet" />
      </head>
      <body>
        <AuthProvider>
          <CalculatorSettingsProvider>
            <LinkButtonVisibilityProvider>
              <ServiceCatalogProvider>
                <WizardProvider>
                  <OffcanvasProvider>
                    <SiteChrome>{children}</SiteChrome>
                  </OffcanvasProvider>
                  <WizardModal />
                </WizardProvider>
              </ServiceCatalogProvider>
            </LinkButtonVisibilityProvider>
          </CalculatorSettingsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
