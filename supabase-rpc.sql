-- Adds many equipment rows and links each to a starting location
-- (HON Warehouse) – returns full equipment_with_location rows.
create or replace function add_equipment_with_location(items jsonb)
returns setof equipment_with_location
language plpgsql security definer as $$
declare
  rec jsonb;
begin
  for rec in
    select * from jsonb_array_elements(items)
  loop
    insert into equipment(
      id,
      model,
      equipment_type,
      serial_number,
      date_imported,
      status,
      date_added,
      last_updated
    ) values (
      (rec->>'id')::uuid,
      rec->>'model',
      rec->>'equipment_type',
      rec->>'serial_number',
      rec->>'date_imported',
      (rec->>'status')::equipment_status,
      (rec->>'date_added')::timestamptz,
      (rec->>'last_updated')::timestamptz
    );

    insert into equipment_location(
      equipment_id,
      location_id,
      updated_at
    ) values (
      (rec->>'id')::uuid,
      (rec->>'location_id')::uuid,
      (rec->>'last_updated')::timestamptz
    );
  end loop;

  return query
    select *
      from equipment_with_location
     where id in (
       select (elem->>'id')::uuid
         from jsonb_array_elements(items) as elem
     );
end $$;

-- Batch transfer – moves N items, updates status, writes history
create or replace function transfer_equipment_batch(transfers jsonb)
returns void
language plpgsql security definer as $$
declare
  t jsonb;
begin
  for t in
    select * from jsonb_array_elements(transfers) as elem
  loop
    -- 1) Update the equipment's status
    update equipment
       set status       = (t->>'new_status')::equipment_status,
           last_updated = (t->>'ts')::timestamptz
     where id = (t->>'equipment_id')::uuid;

    -- 2) Move it to the new location
    update equipment_location
       set location_id = (t->>'to_location_id')::uuid,
           updated_at  = (t->>'ts')::timestamptz
     where equipment_id = (t->>'equipment_id')::uuid;

    -- 3) Record the transfer history
    insert into equipment_transfer_history(
      id,
      equipment_id,
      from_location_id,
      to_location_id,
      previous_status,
      new_status,
      transferred_at
    ) values (
      uuid_generate_v4(),
      (t->>'equipment_id')::uuid,
      (t->>'from_location_id')::uuid,
      (t->>'to_location_id')::uuid,
      (t->>'previous_status')::equipment_status, 
      (t->>'new_status')::equipment_status,       
      (t->>'ts')::timestamptz
    );
  end loop;
end $$;

-- soft-delete helpers
create or replace function delete_equipment_soft(
  p_id     uuid,
  p_reason text,
  p_note   text default null
)
returns void
language sql security definer as $$
  update equipment
     set delete_reason = p_reason::delete_reason, 
         delete_note   = p_note,
         last_updated  = now()
   where id = p_id;
$$;

create or replace function delete_equipment_soft_bulk(
  p_ids    uuid[],
  p_reason text,
  p_note   text default null
)
returns void
language sql security definer as $$
  update equipment
     set delete_reason = p_reason::delete_reason,  
         delete_note   = p_note,
         last_updated  = now()
   where id = any(p_ids);
$$;

