create or replace function public.is_authorized_for_business(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.business_members bm
    where bm.business_id = p_business_id
      and bm.user_id = auth.uid()
  );
$$;

create or replace function public.is_business_owner_or_admin(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.business_members bm
    where bm.business_id = p_business_id
      and bm.user_id = auth.uid()
      and bm.role in ('OWNER', 'ADMIN')
  );
$$;

create or replace function public.is_posted_journal_entry(p_journal_entry_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.journal_entries je
    where je.id = p_journal_entry_id
      and je.status = 'POSTED'
  );
$$;

create or replace function public.is_posted_journal_line(p_journal_entry_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.journal_entries je
    where je.id = p_journal_entry_id
      and je.status = 'POSTED'
  );
$$;

create or replace function public.prevent_posted_journal_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1
    from public.journal_entries je
    where je.id = coalesce(new.journal_entry_id, old.journal_entry_id)
      and je.status = 'POSTED'
  ) then
    raise exception 'Posted journal entries are immutable';
  end if;

  return coalesce(new, old);
end;
$$;

create or replace function public.prevent_posted_journal_line_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1
    from public.journal_entries je
    join public.journal_lines jl on jl.journal_entry_id = je.id
    where jl.id = coalesce(new.id, old.id)
      and je.status = 'POSTED'
  ) then
    raise exception 'Posted journal lines are immutable';
  end if;

  return coalesce(new, old);
end;
$$;

create trigger journal_entries_prevent_posted_update
before update on public.journal_entries
for each row
when (old.status = 'POSTED' or new.status = 'POSTED')
execute function public.prevent_posted_journal_mutation();

create trigger journal_lines_prevent_posted_update
before update on public.journal_lines
for each row
when (old.journal_entry_id is not null)
execute function public.prevent_posted_journal_line_mutation();
