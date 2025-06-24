"use client";
import Image from "next/image";
import { SignInButton, useUser } from "@clerk/nextjs";
import { useRouter } from 'next/navigation';

export default function Home() {
  const { user } = useUser();
  const router = useRouter();

  if (user) {
    router.push('/dashboard');
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <main className="relative h-[100dvh] w-full overflow-hidden">
        <div className="absolute inset-0 w-full h-full">
          <div className="relative w-full h-full">
            <Image
              src="/landing.jpg"
              alt="Woman with notebook at construction site"
              fill
              priority
              className="object-cover"
              style={{
                objectPosition: 'center',
              }}
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-black/30"></div>
          </div>
        </div>
        
        {/* Login Button - Centered */}
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <SignInButton mode="modal">
            <button className="bg-orange-500 hover:bg-orange-600 text-white font-medium py-4 px-12 rounded-full shadow-lg transform hover:scale-105 transition-all text-lg">
              Bejelentkezés
            </button>
          </SignInButton>
        </div>
      </main>
    </div>
  );
}
