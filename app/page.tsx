"use client";
import Image from "next/image";
import { Search, FileText, Wrench, DollarSign } from "lucide-react";
import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { useRouter } from 'next/navigation';

export default function Home() {
  const { user } = useUser();
  const router = useRouter();

  if (user && user.emailAddresses.length > 0) {
    router.push('/dashboard');
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header with Search Bar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white bg-opacity-90 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3 flex justify-center">
          <div className="relative w-full max-w-2xl">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-full bg-gray-50 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Mit parancsolsz?"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <button className="text-gray-500 hover:text-gray-700">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content with Background Image */}
      <main className="relative h-[100dvh] w-full overflow-hidden">
        <div className="absolute inset-0 w-full h-full">
          <div className="relative w-full h-full">
            <Image
              src="/landing.jpg"
              alt="Woman with notebook at construction site"
              fill
              priority
              className="object-cover md:object-contain"
              style={{
                objectPosition: 'center bottom',
              }}
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-black/10"></div>
          </div>
        </div>
        
        {/* Icons Overlay */}
        <div className="fixed bottom-24 left-0 right-0 z-10 py-4 md:py-6 bg-gradient-to-t from-black/40 to-transparent">
          <div className="grid grid-cols-3 gap-6 sm:gap-8 md:gap-12 px-4 w-full max-w-4xl mx-auto">
            {/* Document Icon */}
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full bg-white border-2 border-orange-500 flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform">
                <FileText className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 text-orange-500" />
              </div>
              <span className="mt-2 text-white text-sm md:text-base font-medium text-center">Dokumentumok</span>
            </div>

            {/* Tools Icon */}
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full bg-white border-2 border-orange-500 flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform">
                <Wrench className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 text-orange-500" />
              </div>
              <span className="mt-2 text-white text-sm md:text-base font-medium text-center">Szolgáltatások</span>
            </div>

            {/* Dollar Icon */}
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full bg-white border-2 border-orange-500 flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform">
                <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 text-orange-500" />
              </div>
              <span className="mt-2 text-white text-sm md:text-base font-medium text-center">Árak</span>
            </div>
          </div>
        </div>
      </main>

      {/* Auth Button - Fixed at bottom center */}
      <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center">
        {!user ? (
          <SignInButton mode="modal">
            <button className="bg-orange-500 hover:bg-orange-600 text-white font-medium py-3 px-8 rounded-full shadow-lg transform hover:scale-105 transition-all">
              Bejelentkezés
            </button>
          </SignInButton>
        ) : (
          <UserButton afterSignOutUrl="/" />
        )}
      </div>
    </div>
  );
}
