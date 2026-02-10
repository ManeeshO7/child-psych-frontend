"use client";

import { useEffect, useRef, useState } from "react";

// California bounds for locationRestriction (Places API New)
const CA_BOUNDS = {
  west: -124.41,
  south: 32.53,
  east: -114.13,
  north: 42.01,
};

const PLACES_READY_EVENT = "google-places-ready";

declare global {
  interface Window {
    google?: {
      maps: {
        importLibrary: (name: string) => Promise<unknown>;
        places?: {
          PlaceAutocompleteElement: new (opts?: {
            placeholder?: string;
            includedRegionCodes?: string[];
            locationRestriction?: unknown;
          }) => PlaceAutocompleteElementInstance;
        };
        LatLngBounds?: new (sw: { lat: number; lng: number }, ne: { lat: number; lng: number }) => unknown;
      };
    };
    initCaliforniaAddressAutocomplete?: () => void;
  }
}

type PlaceAutocompleteElementInstance = HTMLElement & {
  placeholder: string;
  includedRegionCodes: string[];
  locationRestriction: unknown;
  addEventListener(type: "gmp-select", listener: (ev: { placePrediction: { toPlace: () => PlaceInstance } }) => void): void;
};

type PlaceInstance = {
  fetchFields: (opts: { fields: string[] }) => Promise<void>;
  formattedAddress?: string;
  addressComponents?: Array<{ shortText?: string; longText?: string; types: string[] }>;
};

export type CaliforniaAddressResult = {
  formattedAddress: string;
  state: string;
  isCalifornia: boolean;
};

type Props = {
  value: string;
  onChange: (address: string, result: CaliforniaAddressResult | null) => void;
  placeholder?: string;
  id?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
};

export function CaliforniaAddressAutocomplete({
  value,
  onChange,
  placeholder = "Start typing a California address…",
  id = "childResidenceAddress",
  required,
  disabled,
  className,
  "aria-label": ariaLabel,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const widgetRef = useRef<PlaceAutocompleteElementInstance | null>(null);
  const apiKey = (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "").trim();

  // Load Maps JavaScript API with loading=async (new loader), then importLibrary('places')
  useEffect(() => {
    if (!apiKey) {
      setLoadError("Google Maps API key is not configured.");
      return;
    }

    function onPlacesReady() {
      setScriptLoaded(true);
    }

    function doLoad() {
      const existing = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existing) {
        if (window.google?.maps?.importLibrary) {
          window.google.maps.importLibrary("places").then(onPlacesReady).catch(() => setLoadError("Failed to load Places library."));
        }
        return;
      }

      window.initCaliforniaAddressAutocomplete = function () {
        window.google?.maps?.importLibrary("places").then(onPlacesReady).catch(() => setLoadError("Failed to load Places library."));
      };

      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&loading=async&callback=initCaliforniaAddressAutocomplete`;
      script.async = true;
      script.defer = true;
      script.onerror = () => setLoadError("Failed to load Google Maps.");
      document.head.appendChild(script);

      return () => {
        delete window.initCaliforniaAddressAutocomplete;
      };
    }

    if (window.google?.maps?.places) {
      setScriptLoaded(true);
      return;
    }

    const cleanup = doLoad();
    return () => {
      cleanup?.();
    };
  }, [apiKey]);

  // Create Place Autocomplete (New) widget when script is ready
  useEffect(() => {
    if (!scriptLoaded || !containerRef.current || !window.google?.maps?.places) return;

    const Places = window.google.maps.places;
    const PlaceAutocompleteElement = Places.PlaceAutocompleteElement as (new (opts?: {
      placeholder?: string;
      includedRegionCodes?: string[];
      locationRestriction?: unknown;
    }) => PlaceAutocompleteElementInstance) | undefined;

    if (!PlaceAutocompleteElement) {
      setLoadError("Place Autocomplete (New) is not available.");
      return;
    }

    const bounds =
      window.google.maps.LatLngBounds &&
      new window.google.maps.LatLngBounds(
        { lat: CA_BOUNDS.south, lng: CA_BOUNDS.west },
        { lat: CA_BOUNDS.north, lng: CA_BOUNDS.east }
      );

    const widget = new PlaceAutocompleteElement({
      placeholder,
      includedRegionCodes: ["us"],
      ...(bounds && { locationRestriction: bounds }),
    }) as PlaceAutocompleteElementInstance;

    widget.addEventListener("gmp-select", async (ev: { placePrediction: { toPlace: () => PlaceInstance } }) => {
      const place = ev.placePrediction.toPlace();
      await place.fetchFields({ fields: ["formattedAddress", "addressComponents"] });
      const formatted = (place as PlaceInstance).formattedAddress ?? "";
      const components = (place as PlaceInstance).addressComponents ?? [];
      const stateComp = components.find((c: { types: string[] }) => c.types?.includes("administrative_area_level_1"));
      const stateShort = stateComp?.shortText ?? stateComp?.longText ?? "";
      const isCalifornia = stateShort === "CA" || stateShort?.toUpperCase() === "CA";

      if (!formatted) {
        onChange("", null);
        return;
      }
      if (!isCalifornia) {
        onChange("", null);
        return;
      }
      onChange(formatted, {
        formattedAddress: formatted,
        state: "California",
        isCalifornia: true,
      });
      // Show the selected address in the widget's input (otherwise it stays empty)
      if (typeof (widget as { value?: string }).value !== "undefined") {
        (widget as { value: string }).value = formatted;
      }
    });

    containerRef.current.innerHTML = "";
    containerRef.current.appendChild(widget);
    widgetRef.current = widget;

    return () => {
      widgetRef.current = null;
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, [scriptLoaded, placeholder, onChange]);

  // Keep widget input in sync when value is set from parent (e.g. after selection or re-render)
  useEffect(() => {
    const w = widgetRef.current as { value?: string } | null;
    if (w && typeof w.value !== "undefined" && value) {
      w.value = value;
    }
  }, [value]);

  // Inject style to remove blue outline from Google widget (must run unconditionally for Rules of Hooks)
  useEffect(() => {
    const styleId = "california-address-autocomplete-no-outline";
    if (document.getElementById(styleId)) return;
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      gmp-place-autocomplete,
      gmp-place-autocomplete * {
        outline: none !important;
      }
      gmp-place-autocomplete:focus,
      gmp-place-autocomplete:focus-within,
      gmp-place-autocomplete:focus-visible {
        outline: none !important;
        box-shadow: none !important;
      }
      gmp-place-autocomplete {
        width: 100% !important;
        min-width: 0 !important;
        min-height: 2.75rem !important;
        display: block !important;
        border: 1px solid #d1d5db !important;
        border-radius: 0.5rem !important;
        box-sizing: border-box !important;
      }
      gmp-place-autocomplete::part(input) {
        width: 100% !important;
        min-width: 0 !important;
        min-height: 2.5rem !important;
        overflow: visible !important;
        padding: 0.5rem 0.75rem !important;
        font-size: 0.875rem !important;
        border: none !important;
        border-radius: inherit !important;
        box-sizing: border-box !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      const existing = document.getElementById(styleId);
      if (existing) existing.remove();
    };
  }, []);

  // Fallback input when no API key, or while Places script is loading (so user always sees a box)
  const fallbackInput = (
    <input
      type="text"
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value, null)}
      placeholder={scriptLoaded ? "Start typing a California address…" : "Loading address search…"}
      required={required}
      disabled={disabled}
      className={className}
      aria-label={ariaLabel ?? "California address"}
      aria-invalid={!!loadError}
      readOnly={!!apiKey && !scriptLoaded}
      autoComplete="off"
    />
  );

  if (!apiKey) {
    return (
      <div className="space-y-1">
        {fallbackInput}
        {loadError && (
          <p className="text-xs text-amber-700">
            {loadError} Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to enable autocomplete.
          </p>
        )}
        <p className="text-xs italic text-warm-brown">Only California addresses are accepted. Visits must occur from California.</p>
      </div>
    );
  }

  // While script is loading, show a visible input so the user always sees an address box
  if (!scriptLoaded) {
    return (
      <div className="space-y-1">
        {fallbackInput}
        <p className="text-xs italic text-warm-brown">Only California addresses are accepted. Visits must occur from California.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Wrapper with min-height so the address box is always visible */}
      <div
        ref={containerRef}
        className="mt-1 flex w-full min-w-0 min-h-[2.75rem] items-center overflow-visible rounded-lg border border-gray-300 bg-white focus-within:border-warm-brown focus-within:ring-1 focus-within:ring-warm-brown [&_*]:outline-none [&_input]:min-h-[2.5rem] [&_input]:min-w-0 [&_input]:w-full [&_input]:flex-1 [&_input]:border-0 [&_input]:bg-transparent [&_input]:py-2 [&_input]:px-3 [&_input]:text-sm [&_input]:leading-normal [&_input]:outline-none [&_input]:ring-0 [&_input]:focus:outline-none [&_input]:focus:ring-0 [&_input]:placeholder:text-gray-400 [&_gmp-place-autocomplete]:w-full"
        style={{ boxSizing: "border-box" }}
      />
      <input type="hidden" id={id} value={value} readOnly aria-hidden="true" tabIndex={-1} />
      {loadError && <p className="text-xs text-amber-700">{loadError}</p>}
      <p className="text-xs italic text-warm-brown">Only California addresses are accepted. Visits must occur from California.</p>
    </div>
  );
}
