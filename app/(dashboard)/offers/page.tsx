import { getUserOffers } from "@/actions/offer-actions";
import { format } from "date-fns";
import { hu } from "date-fns/locale";
import Link from "next/link";

export default async function OffersPage() {
  const offers = await getUserOffers();

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'draft':
        return 'Piszkozat';
      case 'sent':
        return 'Elküldve';
      case 'accepted':
        return 'Elfogadva';
      case 'rejected':
        return 'Elutasítva';
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen w-full bg-gray-50 pt-4">
      <div className="w-full mx-auto px-4 max-w-7xl">
        <div className="mb-6">
          <div className="flex items-center space-x-2">
            <Link
              href="/dashboard"
              className="text-gray-600 hover:text-gray-900 transition-colors"
              aria-label="Vissza a főoldalra"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold text-gray-800">Ajánlatok</h1>
            <Link
              href="/ai-tools/ai-offer-letter"
              className="ml-auto p-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              aria-label="Új ajánlat létrehozása"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                  clipRule="evenodd"
                />
              </svg>
            </Link>
          </div>

          <div className="mt-6 space-y-4">
            {offers.length === 0 ? (
              <div className="bg-white rounded-lg p-6 text-center">
                <p className="text-gray-500">Még nincsenek ajánlataid.</p>
                <Link
                  href="/ai-tools/ai-offer-letter"
                  className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Új ajánlat létrehozása
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {offers.map((offer) => (
                  <Link
                    key={offer.id}
                    href={`/offers/${offer.requirementId}?offerId=${offer.id}`}
                    className="block bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium text-gray-900">
                            {offer.title || 'Névtelen ajánlat'}
                          </h3>
                          {offer.requirement && (
                            <p className="text-sm text-gray-500">
                              {offer.requirement.title}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {getStatusDisplay(offer.status)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="mt-2 flex justify-between items-center">
                        <div className="text-sm text-gray-500">
                          {offer.totalPrice ? (
                            <span className="font-medium text-gray-900">
                              {new Intl.NumberFormat('hu-HU', {
                                style: 'currency',
                                currency: 'HUF',
                                maximumFractionDigits: 0,
                              }).format(offer.totalPrice)}
                            </span>
                          ) : (
                            <span>Ár nincs megadva</span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          {format(new Date(offer.createdAt), 'PPP', { locale: hu })}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}