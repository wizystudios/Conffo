import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ChevronDown, Search } from 'lucide-react';

export interface Country {
  code: string;
  name: string;
  flag: string;
  dial: string;
}

export const countries: Country[] = [
  { code: 'AF', name: 'Afghanistan', flag: '🇦🇫', dial: '+93' },
  { code: 'AL', name: 'Albania', flag: '🇦🇱', dial: '+355' },
  { code: 'DZ', name: 'Algeria', flag: '🇩🇿', dial: '+213' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷', dial: '+54' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', dial: '+61' },
  { code: 'AT', name: 'Austria', flag: '🇦🇹', dial: '+43' },
  { code: 'BD', name: 'Bangladesh', flag: '🇧🇩', dial: '+880' },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪', dial: '+32' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷', dial: '+55' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', dial: '+1' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱', dial: '+56' },
  { code: 'CN', name: 'China', flag: '🇨🇳', dial: '+86' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴', dial: '+57' },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬', dial: '+20' },
  { code: 'ET', name: 'Ethiopia', flag: '🇪🇹', dial: '+251' },
  { code: 'FI', name: 'Finland', flag: '🇫🇮', dial: '+358' },
  { code: 'FR', name: 'France', flag: '🇫🇷', dial: '+33' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', dial: '+49' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭', dial: '+233' },
  { code: 'GR', name: 'Greece', flag: '🇬🇷', dial: '+30' },
  { code: 'IN', name: 'India', flag: '🇮🇳', dial: '+91' },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩', dial: '+62' },
  { code: 'IR', name: 'Iran', flag: '🇮🇷', dial: '+98' },
  { code: 'IQ', name: 'Iraq', flag: '🇮🇶', dial: '+964' },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪', dial: '+353' },
  { code: 'IL', name: 'Israel', flag: '🇮🇱', dial: '+972' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹', dial: '+39' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵', dial: '+81' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪', dial: '+254' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷', dial: '+82' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾', dial: '+60' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽', dial: '+52' },
  { code: 'MA', name: 'Morocco', flag: '🇲🇦', dial: '+212' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱', dial: '+31' },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿', dial: '+64' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬', dial: '+234' },
  { code: 'NO', name: 'Norway', flag: '🇳🇴', dial: '+47' },
  { code: 'PK', name: 'Pakistan', flag: '🇵🇰', dial: '+92' },
  { code: 'PE', name: 'Peru', flag: '🇵🇪', dial: '+51' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭', dial: '+63' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱', dial: '+48' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹', dial: '+351' },
  { code: 'RO', name: 'Romania', flag: '🇷🇴', dial: '+40' },
  { code: 'RU', name: 'Russia', flag: '🇷🇺', dial: '+7' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', dial: '+966' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬', dial: '+65' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦', dial: '+27' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸', dial: '+34' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪', dial: '+46' },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭', dial: '+41' },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭', dial: '+66' },
  { code: 'TR', name: 'Turkey', flag: '🇹🇷', dial: '+90' },
  { code: 'UA', name: 'Ukraine', flag: '🇺🇦', dial: '+380' },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', dial: '+971' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', dial: '+44' },
  { code: 'US', name: 'United States', flag: '🇺🇸', dial: '+1' },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳', dial: '+84' },
  { code: 'TZ', name: 'Tanzania', flag: '🇹🇿', dial: '+255' },
  { code: 'UG', name: 'Uganda', flag: '🇺🇬', dial: '+256' },
  { code: 'RW', name: 'Rwanda', flag: '🇷🇼', dial: '+250' },
  { code: 'SD', name: 'Sudan', flag: '🇸🇩', dial: '+249' },
  { code: 'SS', name: 'South Sudan', flag: '🇸🇸', dial: '+211' },
  { code: 'CD', name: 'DR Congo', flag: '🇨🇩', dial: '+243' },
  { code: 'ZM', name: 'Zambia', flag: '🇿🇲', dial: '+260' },
  { code: 'ZW', name: 'Zimbabwe', flag: '🇿🇼', dial: '+263' },
];

interface CountrySelectorProps {
  value?: string;
  onChange: (countryCode: string) => void;
}

export function CountrySelector({ value, onChange }: CountrySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedCountry = countries.find(c => c.code === value);
  const filteredCountries = countries.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.dial.includes(searchQuery)
  );

  const handleSelect = (countryCode: string) => {
    onChange(countryCode);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="w-full justify-between h-10">
          {selectedCountry ? (
            <span className="flex items-center gap-2">
              <span className="text-xl">{selectedCountry.flag}</span>
              <span>{selectedCountry.name}</span>
              <span className="text-muted-foreground text-sm">{selectedCountry.dial}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">Select country</span>
          )}
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle>Select Country</SheetTitle>
        </SheetHeader>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search countries or dial code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="overflow-y-auto max-h-[calc(80vh-150px)] space-y-1">
          {filteredCountries.map((country) => (
            <button
              key={country.code}
              onClick={() => handleSelect(country.code)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                value === country.code ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
              }`}
            >
              <span className="text-2xl">{country.flag}</span>
              <span className="font-medium flex-1">{country.name}</span>
              <span className="text-sm text-muted-foreground">{country.dial}</span>
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function getCountryFlag(countryCode: string | null | undefined): string | null {
  if (!countryCode) return null;
  const country = countries.find(c => c.code === countryCode);
  return country?.flag || null;
}

export function getCountryDial(countryCode: string | null | undefined): string | null {
  if (!countryCode) return null;
  return countries.find(c => c.code === countryCode)?.dial || null;
}

interface PhoneInputProps {
  countryCode: string;
  onCountryChange: (code: string) => void;
  value: string;
  onChange: (digits: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

/** Country chip + national digits input; emits digits only via onChange. */
export function PhoneInput({ countryCode, onCountryChange, value, onChange, placeholder = 'Phone number', autoFocus }: PhoneInputProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const country = countries.find(c => c.code === countryCode);
  const filtered = countries.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) || c.dial.includes(search)
  );

  return (
    <div className="flex items-center gap-2 border-b border-border/40 focus-within:border-primary transition-colors">
      <Sheet open={pickerOpen} onOpenChange={setPickerOpen}>
        <SheetTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-1 h-12 pr-2 text-base shrink-0"
            aria-label="Select country code"
          >
            {country ? (
              <>
                <span className="text-xl leading-none">{country.flag}</span>
                <span className="text-sm text-muted-foreground">{country.dial}</span>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">Country</span>
            )}
            <ChevronDown className="h-3.5 w-3.5 opacity-50" />
          </button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl">
          <SheetHeader className="pb-4">
            <SheetTitle>Select Country</SheetTitle>
          </SheetHeader>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search country or dial code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="overflow-y-auto max-h-[calc(80vh-150px)] space-y-1">
            {filtered.map((c) => (
              <button
                key={c.code}
                onClick={() => { onCountryChange(c.code); setPickerOpen(false); setSearch(''); }}
                className={`w-full flex items-center gap-3 p-3 rounded-lg text-left ${
                  countryCode === c.code ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                }`}
              >
                <span className="text-2xl">{c.flag}</span>
                <span className="font-medium flex-1">{c.name}</span>
                <span className="text-sm text-muted-foreground">{c.dial}</span>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
      <input
        type="tel"
        inputMode="tel"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, ''))}
        className="flex-1 h-12 bg-transparent border-0 outline-none text-base placeholder:text-muted-foreground/60"
        autoFocus={autoFocus}
      />
    </div>
  );
}
