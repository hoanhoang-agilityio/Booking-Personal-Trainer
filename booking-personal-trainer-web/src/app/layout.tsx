import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import "flatpickr/dist/flatpickr.css";
import { Auth0SessionProvider } from "@/context/Auth0SessionContext";
import { ProfileProvider } from "@/context/ProfileContext";
import { SidebarProvider } from "@/context/SidebarContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { ToastProvider } from "@/context/ToastContext";
import { NotificationsProvider } from "@/context/NotificationsContext";
import Auth0UserProvider from "@/components/providers/Auth0UserProvider";
import Auth0BackendSync from "@/components/providers/Auth0BackendSync";
import Auth0LinkingBlocker from "@/components/providers/Auth0LinkingBlocker";
import { auth0 } from "@/lib/auth0";

export const metadata: Metadata = {
  icons: {
    icon: "/images/logo/hdevfit-favicon.svg",
    shortcut: "/images/logo/hdevfit-favicon.svg",
    apple: "/images/logo/hdevfit-favicon.svg",
  },
};

const outfit = Outfit({
  subsets: ["latin"],
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth0.getSession();
  return (
    <html lang="en">
      <body className={`${outfit.className} dark:bg-gray-900`}>
        <ThemeProvider>
          <Auth0UserProvider user={session?.user}>
            <ProfileProvider>
              <Auth0SessionProvider>
                <ToastProvider>
                  <Auth0LinkingBlocker />
                  <Auth0BackendSync />
                  <NotificationsProvider>
                    <SidebarProvider>{children}</SidebarProvider>
                  </NotificationsProvider>
                </ToastProvider>
              </Auth0SessionProvider>
            </ProfileProvider>
          </Auth0UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
