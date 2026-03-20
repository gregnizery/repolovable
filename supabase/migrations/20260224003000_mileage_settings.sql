-- Add mileage calculation preferences to white_label_settings
ALTER TABLE white_label_settings 
ADD COLUMN company_address text,
ADD COLUMN company_lat double precision,
ADD COLUMN company_lng double precision,
ADD COLUMN price_per_km double precision DEFAULT 0.60;
