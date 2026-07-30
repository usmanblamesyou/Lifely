import './globals.css';
import type { Metadata } from 'next';
import { DateProvider } from '../context/DateContext';
import Sidebar from '../components/shell/Sidebar';
import TopBar from '../components/shell/TopBar';
import MainContent from '../components/shell/MainContent';

export const metadata: Metadata = {
  title: 'Lifely',
  description: 'Local-first desktop habit and task tracker',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <DateProvider>
          <div className="app-container">
            <Sidebar />
            <div className="app-main-wrapper">
              <TopBar />
              <MainContent>{children}</MainContent>
            </div>
          </div>
        </DateProvider>
      </body>
    </html>
  );
}
