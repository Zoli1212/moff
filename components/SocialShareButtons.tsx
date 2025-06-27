// components/SocialShareButtons.tsx
"use client";

import { usePathname } from 'next/navigation';
import { MessageCircle, MessageSquare, MessageSquareText, Mail } from 'lucide-react';

export default function SocialShareButtons() {
  const pathname = usePathname();
  const pageUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${pathname}`
    : '';

  const encodedUrl = encodeURIComponent(pageUrl);

  return (
    <div className="flex gap-2">
      {/* Messenger */}
      <a
        href={`fb-messenger://share?link=${encodedUrl}`}
        aria-label="Share on Messenger"
        className="w-8 h-8 bg-blue-600 text-white rounded flex items-center justify-center shadow-sm hover:shadow transition-colors hover:bg-blue-700"
      >
        <MessageCircle className="w-4 h-4" />
      </a>

      {/* WhatsApp */}
      <a
        href={`https://wa.me/?text=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on WhatsApp"
        className="w-8 h-8 bg-green-500 text-white rounded flex items-center justify-center shadow-sm hover:shadow transition-colors hover:bg-green-600"
      >
        <MessageSquare className="w-4 h-4" />
      </a>

      {/* Viber */}
      <a
        href={`viber://forward?text=${encodedUrl}`}
        aria-label="Share on Viber"
        className="w-8 h-8 bg-purple-600 text-white rounded flex items-center justify-center shadow-sm hover:shadow transition-colors hover:bg-purple-700"
      >
        <MessageSquareText className="w-4 h-4" />
      </a>

      {/* Email */}
      <a
        href={`mailto:?body=${encodedUrl}`}
        aria-label="Share via Email"
        className="w-8 h-8 bg-gray-600 text-white rounded flex items-center justify-center shadow-sm hover:shadow transition-colors hover:bg-gray-700"
      >
        <Mail className="w-4 h-4" />
      </a>
    </div>
  );
}
