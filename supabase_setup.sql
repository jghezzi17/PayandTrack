-- Esegui questo script nell'SQL Editor del tuo progetto Supabase

-- Abilitiamo l'estensione uuid se non è attiva
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Creazione Tabella Categorie (Etichette)
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'tag',
  color TEXT NOT NULL DEFAULT '#ffffff',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Creazione Tabella Spese
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  category_id UUID REFERENCES public.categories(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inseriamo alcune categorie di base richieste
INSERT INTO public.categories (name, icon, color) VALUES 
('Sigarette', 'cigarette', '#ff4d4d'),
('Alcol', 'wine', '#9b59b6'),
('Biglietti Festa', 'ticket', '#f1c40f'),
('Cibo', 'utensils', '#e67e22'),
('Amazon', 'shopping-cart', '#3498db'),
('Spesa', 'shopping-basket', '#2ecc71');

-- Creiamo una view o funzione per le statistiche mensili (opzionale, utile per aggregazioni)
CREATE OR REPLACE FUNCTION get_monthly_spending(month_start DATE, month_end DATE)
RETURNS DECIMAL AS $$
BEGIN
  RETURN (SELECT COALESCE(SUM(amount), 0) FROM public.expenses WHERE date >= month_start AND date <= month_end);
END;
$$ LANGUAGE plpgsql;
