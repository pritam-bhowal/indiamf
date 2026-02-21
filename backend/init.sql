-- Create funds table
CREATE TABLE IF NOT EXISTS funds (
    scheme_code VARCHAR(50) PRIMARY KEY,
    scheme_name VARCHAR(500) NOT NULL,
    amc VARCHAR(200),
    category VARCHAR(100),
    sub_category VARCHAR(200),
    current_nav DECIMAL(15, 4),
    nav_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create fund_returns table
CREATE TABLE IF NOT EXISTS fund_returns (
    id SERIAL PRIMARY KEY,
    scheme_code VARCHAR(50) REFERENCES funds(scheme_code) ON DELETE CASCADE,
    return_1y DECIMAL(10, 4),
    return_3y DECIMAL(10, 4),
    return_5y DECIMAL(10, 4),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(scheme_code)
);

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL,
    sub_category_name VARCHAR(200),
    UNIQUE(category_name, sub_category_name)
);

-- Create indexes for search and filtering
CREATE INDEX IF NOT EXISTS idx_funds_scheme_name ON funds(scheme_name);
CREATE INDEX IF NOT EXISTS idx_funds_category ON funds(category, sub_category);
CREATE INDEX IF NOT EXISTS idx_funds_name_search ON funds USING gin(to_tsvector('english', scheme_name));
