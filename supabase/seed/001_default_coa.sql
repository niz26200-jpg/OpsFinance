insert into accounts (business_id, code, name, account_type, parent_id, normal_balance, is_system, is_active)
select b.id, '1000', 'Assets', 'ASSET', null, 'DEBIT', true, true
from businesses b
on conflict (business_id, code) do nothing;

insert into accounts (business_id, code, name, account_type, parent_id, normal_balance, is_system, is_active)
select b.id, '1100', 'Cash', 'ASSET', a.id, 'DEBIT', true, true
from businesses b
join accounts a on a.business_id = b.id and a.code = '1000'
on conflict (business_id, code) do nothing;

insert into accounts (business_id, code, name, account_type, parent_id, normal_balance, is_system, is_active)
select b.id, '1110', 'Maybank', 'ASSET', a.id, 'DEBIT', true, true
from businesses b
join accounts a on a.business_id = b.id and a.code = '1000'
on conflict (business_id, code) do nothing;

insert into accounts (business_id, code, name, account_type, parent_id, normal_balance, is_system, is_active)
select b.id, '1120', 'CIMB', 'ASSET', a.id, 'DEBIT', true, true
from businesses b
join accounts a on a.business_id = b.id and a.code = '1000'
on conflict (business_id, code) do nothing;

insert into accounts (business_id, code, name, account_type, parent_id, normal_balance, is_system, is_active)
select b.id, '1200', 'Accounts Receivable', 'ASSET', a.id, 'DEBIT', true, true
from businesses b
join accounts a on a.business_id = b.id and a.code = '1000'
on conflict (business_id, code) do nothing;

insert into accounts (business_id, code, name, account_type, parent_id, normal_balance, is_system, is_active)
select b.id, '1300', 'Inventory', 'ASSET', a.id, 'DEBIT', true, true
from businesses b
join accounts a on a.business_id = b.id and a.code = '1000'
on conflict (business_id, code) do nothing;

insert into accounts (business_id, code, name, account_type, parent_id, normal_balance, is_system, is_active)
select b.id, '2000', 'Liabilities', 'LIABILITY', null, 'CREDIT', true, true
from businesses b
on conflict (business_id, code) do nothing;

insert into accounts (business_id, code, name, account_type, parent_id, normal_balance, is_system, is_active)
select b.id, '2100', 'Accounts Payable', 'LIABILITY', a.id, 'CREDIT', true, true
from businesses b
join accounts a on a.business_id = b.id and a.code = '2000'
on conflict (business_id, code) do nothing;

insert into accounts (business_id, code, name, account_type, parent_id, normal_balance, is_system, is_active)
select b.id, '2200', 'Bank Loan', 'LIABILITY', a.id, 'CREDIT', true, true
from businesses b
join accounts a on a.business_id = b.id and a.code = '2000'
on conflict (business_id, code) do nothing;

insert into accounts (business_id, code, name, account_type, parent_id, normal_balance, is_system, is_active)
select b.id, '3000', 'Equity', 'EQUITY', null, 'CREDIT', true, true
from businesses b
on conflict (business_id, code) do nothing;

insert into accounts (business_id, code, name, account_type, parent_id, normal_balance, is_system, is_active)
select b.id, '3100', 'Capital', 'EQUITY', a.id, 'CREDIT', true, true
from businesses b
join accounts a on a.business_id = b.id and a.code = '3000'
on conflict (business_id, code) do nothing;

insert into accounts (business_id, code, name, account_type, parent_id, normal_balance, is_system, is_active)
select b.id, '3200', 'Retained Earnings', 'EQUITY', a.id, 'CREDIT', true, true
from businesses b
join accounts a on a.business_id = b.id and a.code = '3000'
on conflict (business_id, code) do nothing;

insert into accounts (business_id, code, name, account_type, parent_id, normal_balance, is_system, is_active)
select b.id, '3300', 'Drawings', 'EQUITY', a.id, 'CREDIT', true, true
from businesses b
join accounts a on a.business_id = b.id and a.code = '3000'
on conflict (business_id, code) do nothing;

insert into accounts (business_id, code, name, account_type, parent_id, normal_balance, is_system, is_active)
select b.id, '4000', 'Revenue', 'REVENUE', null, 'CREDIT', true, true
from businesses b
on conflict (business_id, code) do nothing;

insert into accounts (business_id, code, name, account_type, parent_id, normal_balance, is_system, is_active)
select b.id, '4100', 'Sales', 'REVENUE', a.id, 'CREDIT', true, true
from businesses b
join accounts a on a.business_id = b.id and a.code = '4000'
on conflict (business_id, code) do nothing;

insert into accounts (business_id, code, name, account_type, parent_id, normal_balance, is_system, is_active)
select b.id, '4200', 'Other Income', 'REVENUE', a.id, 'CREDIT', true, true
from businesses b
join accounts a on a.business_id = b.id and a.code = '4000'
on conflict (business_id, code) do nothing;

insert into accounts (business_id, code, name, account_type, parent_id, normal_balance, is_system, is_active)
select b.id, '5000', 'COGS', 'COGS', null, 'DEBIT', true, true
from businesses b
on conflict (business_id, code) do nothing;

insert into accounts (business_id, code, name, account_type, parent_id, normal_balance, is_system, is_active)
select b.id, '5100', 'Cost of Goods Sold', 'COGS', a.id, 'DEBIT', true, true
from businesses b
join accounts a on a.business_id = b.id and a.code = '5000'
on conflict (business_id, code) do nothing;

insert into accounts (business_id, code, name, account_type, parent_id, normal_balance, is_system, is_active)
select b.id, '6000', 'Expenses', 'EXPENSE', null, 'DEBIT', true, true
from businesses b
on conflict (business_id, code) do nothing;

insert into accounts (business_id, code, name, account_type, parent_id, normal_balance, is_system, is_active)
select b.id, '6100', 'Rental', 'EXPENSE', a.id, 'DEBIT', true, true
from businesses b
join accounts a on a.business_id = b.id and a.code = '6000'
on conflict (business_id, code) do nothing;

insert into accounts (business_id, code, name, account_type, parent_id, normal_balance, is_system, is_active)
select b.id, '6200', 'Salary', 'EXPENSE', a.id, 'DEBIT', true, true
from businesses b
join accounts a on a.business_id = b.id and a.code = '6000'
on conflict (business_id, code) do nothing;

insert into accounts (business_id, code, name, account_type, parent_id, normal_balance, is_system, is_active)
select b.id, '6300', 'Petrol', 'EXPENSE', a.id, 'DEBIT', true, true
from businesses b
join accounts a on a.business_id = b.id and a.code = '6000'
on conflict (business_id, code) do nothing;

insert into accounts (business_id, code, name, account_type, parent_id, normal_balance, is_system, is_active)
select b.id, '6400', 'Utilities', 'EXPENSE', a.id, 'DEBIT', true, true
from businesses b
join accounts a on a.business_id = b.id and a.code = '6000'
on conflict (business_id, code) do nothing;

insert into accounts (business_id, code, name, account_type, parent_id, normal_balance, is_system, is_active)
select b.id, '6500', 'Advertising', 'EXPENSE', a.id, 'DEBIT', true, true
from businesses b
join accounts a on a.business_id = b.id and a.code = '6000'
on conflict (business_id, code) do nothing;

insert into accounts (business_id, code, name, account_type, parent_id, normal_balance, is_system, is_active)
select b.id, '6600', 'Bank Charges', 'EXPENSE', a.id, 'DEBIT', true, true
from businesses b
join accounts a on a.business_id = b.id and a.code = '6000'
on conflict (business_id, code) do nothing;
