import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Building2, Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Company {
    nom_complet: string;
    siren: string;
    siege: {
        siret: string;
        adresse: string;
        code_postal: string;
        libelle_commune: string;
    };
}

interface CompanyAutocompleteProps {
    value: string;
    onChange: (value: string) => void;
    onCompanySelect?: (company: {
        name: string;
        siret: string;
        address: string;
        siren: string;
        vatNumber: string;
    }) => void;
    placeholder?: string;
    className?: string;
}

export function CompanyAutocomplete({
    value,
    onChange,
    onCompanySelect,
    placeholder = "Nom de l'entreprise ou SIREN...",
    className
}: CompanyAutocompleteProps) {
    const [inputValue, setInputValue] = useState(value);
    const [results, setResults] = useState<Company[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        setInputValue(value);
    }, [value]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const searchCompanies = async (query: string) => {
        if (query.length < 3) {
            setResults([]);
            setIsOpen(false);
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch(`https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(query)}&per_page=5`);
            const data = await response.json();
            setResults(data.results || []);
            setIsOpen(true);
        } catch (error) {
            console.error("Erreur recherche entreprises:", error);
            setResults([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setInputValue(val);
        onChange(val);

        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            searchCompanies(val);
        }, 400);
    };

    const calculateVAT = (siren: string) => {
        const sirenNum = parseInt(siren);
        const key = (12 + 3 * (sirenNum % 97)) % 97;
        const keyStr = key.toString().padStart(2, '0');
        return `FR${keyStr}${siren}`;
    };

    const handleSelect = (company: Company) => {
        const name = company.nom_complet;
        const siren = company.siren;
        const siret = company.siege.siret;
        const address = `${company.siege.adresse}, ${company.siege.code_postal} ${company.siege.libelle_commune}`;
        const vatNumber = calculateVAT(siren);

        setInputValue(name);
        onChange(name);
        setIsOpen(false);

        if (onCompanySelect) {
            onCompanySelect({
                name,
                siret,
                address,
                siren,
                vatNumber
            });
        }
    };

    return (
        <div ref={wrapperRef} className="relative w-full">
            <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                <Input
                    value={inputValue}
                    onChange={handleInputChange}
                    onFocus={() => {
                        if (results.length > 0) setIsOpen(true);
                    }}
                    placeholder={placeholder}
                    className={cn("pl-10 h-12 rounded-xl", className)}
                />
                {isLoading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
            </div>

            {isOpen && results.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-xl shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <ul className="max-h-60 overflow-auto py-1">
                        {results.map((c) => (
                            <li
                                key={c.siege.siret}
                                className="px-3 py-2.5 text-sm cursor-pointer hover:bg-muted/50 transition-colors flex flex-col gap-0.5 border-b border-border/50 last:border-0"
                                onClick={() => handleSelect(c)}
                            >
                                <span className="font-bold text-foreground line-clamp-1">{c.nom_complet}</span>
                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                    <span className="bg-primary/5 text-primary px-1 rounded font-medium">SIREN: {c.siren}</span>
                                    <span className="truncate">{c.siege.libelle_commune} ({c.siege.code_postal})</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                    <div className="p-2 border-t border-border bg-muted/20">
                        <p className="text-[10px] text-center text-muted-foreground italic">
                            Données issues de l'Annuaire des Entreprises (État Français)
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
