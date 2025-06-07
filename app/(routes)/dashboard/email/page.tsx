"use client";

import { useEffect, useState } from "react";

export default function AuthPage() {
  const [authUrl, setAuthUrl] = useState("");

  useEffect(() => {
    fetch("/api/auth/test")
      .then(res => res.json())
      .then(data => setAuthUrl(data.url));
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg flex flex-col items-center w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">Email Elemzés</h1>
        {authUrl && (
          <a href={authUrl} className="w-full">
            <button
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg w-full transition duration-150 shadow-md"
            >
              <svg className="w-5 h-5" viewBox="0 0 488 512" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path fill="#fff" d="M488 261.8c0-17.8-1.5-35.1-4.3-51.8H249v98h135.6c-5.9 32.1-23.8 59.3-50.7 77.6v64.1h81.9c48-44.2 75.2-109.4 75.2-187.9z"/>
                <path fill="#fff" d="M249 492c67 0 123.1-22.1 164.1-59.8l-81.9-64.1c-22.8 15.3-52 24.4-82.2 24.4-63.2 0-116.7-42.7-135.9-100.3H29.2v62.8C70.3 445.6 153.5 492 249 492z"/>
                <path fill="#fff" d="M113.1 292.2c-10.1-29.6-10.1-61.2 0-90.8v-62.8H29.2c-20.3 39.8-32 84.3-32 132.2s11.7 92.4 32 132.2l83.9-62.8z"/>
                <path fill="#fff" d="M249 97.6c36.3 0 68.8 12.5 94.6 37l71.1-71.1C372.1 25.7 314.9 0 249 0 153.5 0 70.3 46.4 29.2 119.8l83.9 62.8C132.3 140.3 185.8 97.6 249 97.6z"/>
              </svg>
              Jelentkezz be Google-lel
            </button>
          </a>
        )}
      </div>
    </div>
  );
}

