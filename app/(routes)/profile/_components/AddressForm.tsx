"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";

interface AddressData {
  address: string;
  city: string;
  zip: string;
  country: string;
}

export default function AddressForm() {
  const [formData, setFormData] = useState<AddressData>({
    address: "",
    city: "",
    zip: "",
    country: "Magyarország",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Fetch current address data
    const fetchAddress = async () => {
      try {
        const response = await fetch("/api/user/address");
        if (response.ok) {
          const data = await response.json();
          if (data.address || data.city || data.zip || data.country) {
            setFormData({
              address: data.address || "",
              city: data.city || "",
              zip: data.zip || "",
              country: data.country || "Magyarország",
            });
          }
        }
      } catch (error) {
        console.error("Error fetching address:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAddress();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const response = await fetch("/api/user/address", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success("Cím sikeresen mentve!");
      } else {
        toast.error("Hiba történt a mentés során");
      }
    } catch (error) {
      console.error("Error saving address:", error);
      toast.error("Hiba történt a mentés során");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        Betöltés...
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        padding: "24px",
        maxWidth: "600px",
      }}
    >
      <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "16px" }}>
        Számlázási és rendelési cím
      </h2>
      <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "24px" }}>
        Ez a cím kerül felhasználásra számlázáskor és rendelésekkor.
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "16px" }}>
          <label
            htmlFor="address"
            style={{
              display: "block",
              fontSize: "14px",
              fontWeight: "500",
              marginBottom: "6px",
            }}
          >
            Utca, házszám
          </label>
          <input
            type="text"
            id="address"
            value={formData.address}
            onChange={(e) =>
              setFormData({ ...formData, address: e.target.value })
            }
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              fontSize: "14px",
            }}
            placeholder="Példa utca 42."
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "16px", marginBottom: "16px" }}>
          <div>
            <label
              htmlFor="city"
              style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "500",
                marginBottom: "6px",
              }}
            >
              Város
            </label>
            <input
              type="text"
              id="city"
              value={formData.city}
              onChange={(e) =>
                setFormData({ ...formData, city: e.target.value })
              }
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "14px",
              }}
              placeholder="Budapest"
            />
          </div>

          <div>
            <label
              htmlFor="zip"
              style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "500",
                marginBottom: "6px",
              }}
            >
              Irányítószám
            </label>
            <input
              type="text"
              id="zip"
              value={formData.zip}
              onChange={(e) =>
                setFormData({ ...formData, zip: e.target.value })
              }
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "14px",
              }}
              placeholder="1234"
            />
          </div>
        </div>

        <div style={{ marginBottom: "24px" }}>
          <label
            htmlFor="country"
            style={{
              display: "block",
              fontSize: "14px",
              fontWeight: "500",
              marginBottom: "6px",
            }}
          >
            Ország
          </label>
          <input
            type="text"
            id="country"
            value={formData.country}
            onChange={(e) =>
              setFormData({ ...formData, country: e.target.value })
            }
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              fontSize: "14px",
            }}
            placeholder="Magyarország"
          />
        </div>

        <button
          type="submit"
          disabled={isSaving}
          style={{
            width: "100%",
            padding: "10px 16px",
            backgroundColor: "#FE9C00",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "600",
            cursor: isSaving ? "not-allowed" : "pointer",
            opacity: isSaving ? 0.7 : 1,
          }}
        >
          {isSaving ? "Mentés..." : "Cím mentése"}
        </button>
      </form>
    </div>
  );
}
