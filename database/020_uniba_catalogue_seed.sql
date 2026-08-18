-- UNIBA Connect demonstration catalogue.
-- Product names and categories are based on UNIBA's public catalogue.

insert into public.products (code, name, category, description, is_active)
select seed.code, seed.name, seed.category, seed.description, true
from (
  values
    ('UNIBA-UNISOL', 'UNISOL', 'NPK Powder Products', 'Water-soluble NPK fertiliser series for drip irrigation, foliar application and open-field fertilisation.'),
    ('UNIBA-UNISOL-FOLIAR', 'UNISOL FOLIAR', 'NPK Powder Products', 'UNIBA NPK powder product for foliar nutrition programmes.'),
    ('UNIBA-CROSS-FULL-MASTER', 'CROSS FULL MASTER', 'Biostimulants', 'UNIBA biostimulant product for plant nutrition programmes.'),
    ('UNIBA-HBRID-JEL', 'HBRID JEL', 'Gel & SC Products', 'UNIBA gel product range for plant nutrition applications.'),
    ('UNIBA-QUANTUM-PLUS', 'QUANTUM plus', 'Special Products', 'UNIBA special product for plant nutrition programmes.'),
    ('UNIBA-GROWER', 'GROWER', 'Special Products', 'UNIBA featured product for plant nutrition programmes.'),
    ('UNIBA-COSMO-FER', 'COSMO FER', 'Micro Element Products', 'UNIBA micro-element product range.'),
    ('UNIBA-NEXT-CAL', 'NEXT CAL', 'Special Products', 'UNIBA calcium-focused plant nutrition product.')
) as seed(code, name, category, description)
where not exists (
  select 1 from public.products existing where existing.code = seed.code
);
