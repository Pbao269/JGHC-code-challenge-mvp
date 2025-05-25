-- pg_cron installation
create extension if not exists pg_cron   with schema extensions;

-- hard-delete primitive  
create or replace function hard_delete_equipment(p_ids uuid[])
returns void
language plpgsql security definer
as $$
begin
  -- child tables
  delete from equipment_transfer_history where equipment_id = any(p_ids);
  delete from equipment_location         where equipment_id = any(p_ids);

  -- parent table
  delete from equipment where id = any(p_ids);
end $$;

-- weekly wrapper – builds id list then calls the primitive
-- Deletes *every* row that has been soft-deleted (delete_reason set)
create or replace function hard_delete_soft_deleted_weekly()
returns void
language plpgsql security definer
as $$
declare
  victim_ids uuid[];
begin
  select array_agg(id)    -- may be NULL if nothing to purge
    into victim_ids
    from equipment
   where delete_reason is not null;

  if victim_ids is not null then
    perform hard_delete_equipment(victim_ids);
  end if;
end $$;

-- pg_cron delete – 23:59 Eastern Time every Sunday
select cron.schedule(
         'weekly_equipment_hard_delete',           -- job name
         'America/New_York',                       -- ET incl. DST
         '59 23 * * 0',                            -- 23:59 every Sun
         $$call hard_delete_soft_deleted_weekly();$$
       );
