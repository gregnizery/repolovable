import { useRef, useEffect, useState } from "react";
import { useJsApiLoader } from "@react-google-maps/api";
import { Input } from "@/components/ui/input";
import { MapPin, Loader2 } from "lucide-react";

const libraries: ("places")[] = ["places"];

interface AddressAutocompleteProps {
    value: string;
    onChange: (value: string) => void;
    onPlaceSelect?: (place: { address: string; lat: number; lng: number }) => void;
    placeholder?: string;
    className?: string;
}

export function AddressAutocomplete({ value, onChange, onPlaceSelect, placeholder = "Rechercher une adresse...", className }: AddressAutocompleteProps) {
    const [inputValue, setInputValue] = useState(value);
    const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
    const [isOpen, setIsOpen] = useState(false);

    const wrapperRef = useRef<HTMLDivElement>(null);
    const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
    const placesService = useRef<google.maps.places.PlacesService | null>(null);

    // Sync internal state with external value changes
    useEffect(() => {
        setInputValue(value);
    }, [value]);

    const { isLoaded, loadError } = useJsApiLoader({
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
        libraries,
        language: "fr",
        region: "FR",
    });

    useEffect(() => {
        if (isLoaded && !autocompleteService.current) {
            autocompleteService.current = new window.google.maps.places.AutocompleteService();
            // Web service needs a dummy element
            placesService.current = new window.google.maps.places.PlacesService(document.createElement('div'));
        }
    }, [isLoaded]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setInputValue(val);
        onChange(val);

        if (!val || !autocompleteService.current) {
            setPredictions([]);
            setIsOpen(false);
            return;
        }

        autocompleteService.current.getPlacePredictions(
            { input: val },
            (results, status) => {
                if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
                    setPredictions(results);
                    setIsOpen(true);
                } else {
                    setPredictions([]);
                    setIsOpen(false);
                }
            }
        );
    };

    const handleSelectPrediction = (placeId: string, description: string) => {
        setInputValue(description);
        onChange(description);
        setIsOpen(false);

        if (placesService.current && onPlaceSelect) {
            placesService.current.getDetails(
                { placeId, fields: ["geometry", "formatted_address", "name"] },
                (place, status) => {
                    if (status === window.google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
                        const address = place.formatted_address || place.name || description;
                        onPlaceSelect({
                            address,
                            lat: place.geometry.location.lat(),
                            lng: place.geometry.location.lng()
                        });
                    }
                }
            );
        }
    };

    // Fallback if no API key is set
    if (!import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
        return (
            <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    className={`pl-9 ${className || ""}`}
                    placeholder={placeholder}
                    value={inputValue}
                    onChange={(e) => {
                        setInputValue(e.target.value);
                        onChange(e.target.value);
                    }}
                />
                <div className="text-[10px] text-destructive mt-1">
                    Clé API Google Maps manquante (VITE_GOOGLE_MAPS_API_KEY)
                </div>
            </div>
        );
    }

    return (
        <div ref={wrapperRef} className="relative">
            {!isLoaded ? (
                <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground z-10" />
            ) : (
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
            )}
            <Input
                type="text"
                className={`pl-9 relative z-0 ${className || ""}`}
                placeholder={placeholder}
                value={inputValue}
                onChange={handleInputChange}
                onFocus={() => {
                    if (predictions.length > 0) setIsOpen(true);
                }}
                disabled={!isLoaded || !!loadError}
            />
            {isOpen && predictions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-xl shadow-lg overflow-hidden">
                    <ul className="max-h-60 overflow-auto py-1">
                        {predictions.map((p) => (
                            <li
                                key={p.place_id}
                                className="px-3 py-2.5 text-sm cursor-pointer hover:bg-muted/50 transition-colors flex flex-col"
                                onClick={() => handleSelectPrediction(p.place_id, p.description)}
                            >
                                <span className="font-medium text-foreground">{p.structured_formatting?.main_text || p.description}</span>
                                {p.structured_formatting?.secondary_text && (
                                    <span className="text-xs text-muted-foreground">{p.structured_formatting.secondary_text}</span>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            {loadError && (
                <div className="text-[10px] text-destructive mt-1">
                    Erreur de chargement Google Maps
                </div>
            )}
        </div>
    );
}
