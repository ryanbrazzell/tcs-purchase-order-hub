import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TCS Purchase Order Hub",
  description: "Convert customer proposals to purchase orders",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-tcs-gray-50 flex flex-col">
          <header className="bg-white shadow-sm border-b border-tcs-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                <div className="flex items-center">
                  <h1 className="text-2xl font-bold text-tcs-blue-700">
                    TCS Purchase Order Hub
                  </h1>
                </div>
                <nav className="flex space-x-4">
                  <a href="/" className="text-tcs-gray-700 hover:text-tcs-blue-600 px-3 py-2 rounded-md text-sm font-medium">
                    New PO
                  </a>
                  <a href="/orders" className="text-tcs-gray-700 hover:text-tcs-blue-600 px-3 py-2 rounded-md text-sm font-medium">
                    Recent Orders
                  </a>
                </nav>
              </div>
            </div>
          </header>
          
          <main className="flex-1">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {children}
            </div>
          </main>
          
          <footer className="bg-white border-t border-tcs-gray-200 mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <p className="text-center text-sm text-tcs-gray-600">
                © 2024 TCS Purchase Order Hub. For support, contact IT department.
              </p>
            </div>
          </footer>
        </div>
        <Toaster 
          position="top-right"
          toastOptions={{
            className: '',
            style: {
              border: '1px solid #e5e7eb',
              padding: '16px',
              color: '#111827',
            },
          }}
        />
      </body>
    </html>
  );
}
