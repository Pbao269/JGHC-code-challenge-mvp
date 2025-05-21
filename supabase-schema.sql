-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Equipment status type
CREATE TYPE equipment_status AS ENUM (
  'stored', 
  'maintenance', 
  'replaced', 
  'in-use', 
  'need-replacement'
);

-- Building type enum
CREATE TYPE building_type AS ENUM (
  'classroom',
  'office',
  'warehouse'
);

-- Delete reason enum
CREATE TYPE delete_reason AS ENUM (
  'broken',
  'obsolete',
  'other'
);

-- Equipment table
CREATE TABLE equipment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model VARCHAR(255) NOT NULL,
  equipment_type VARCHAR(50) NOT NULL,
  serial_number VARCHAR(100) NOT NULL,
  date_imported VARCHAR(10) NOT NULL, -- MM/YYYY format
  status equipment_status NOT NULL DEFAULT 'stored',
  date_added TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delete_reason delete_reason,
  delete_note TEXT
);

-- Locations table
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_name VARCHAR(255) NOT NULL UNIQUE,
  building_type building_type NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Equipment location table (current location of equipment)
CREATE TABLE equipment_location (
  equipment_id UUID PRIMARY KEY REFERENCES equipment(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Equipment transfer history table
CREATE TABLE equipment_transfer_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  from_location_id UUID NOT NULL REFERENCES locations(id),
  to_location_id UUID NOT NULL REFERENCES locations(id),
  previous_status equipment_status NOT NULL,
  new_status equipment_status NOT NULL,
  transferred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- View to join equipment with their current location
CREATE OR REPLACE VIEW equipment_with_location AS
  SELECT 
    e.id,
    e.model,
    e.equipment_type,
    e.serial_number,
    e.date_imported,
    e.status,
    e.date_added,
    e.last_updated,
    e.delete_reason,
    e.delete_note,
    el.location_id,
    l.room_name,
    l.building_type
  FROM 
    equipment e
  JOIN 
    equipment_location el ON e.id = el.equipment_id
  JOIN 
    locations l ON el.location_id = l.id;

-- Function to transfer equipment
CREATE OR REPLACE FUNCTION transfer_equipment(
  p_equipment_id UUID,
  p_to_location_id UUID,
  p_from_location_id UUID,
  p_previous_status equipment_status,
  p_new_status equipment_status,
  p_timestamp TIMESTAMPTZ
)
RETURNS VOID AS $$
BEGIN
  -- Update equipment status
  UPDATE equipment
  SET 
    status = p_new_status,
    last_updated = p_timestamp
  WHERE 
    id = p_equipment_id;
    
  -- Update equipment location
  UPDATE equipment_location
  SET 
    location_id = p_to_location_id,
    updated_at = p_timestamp
  WHERE 
    equipment_id = p_equipment_id;
    
  -- Record the transfer in history
  INSERT INTO equipment_transfer_history (
    equipment_id,
    from_location_id,
    to_location_id,
    previous_status,
    new_status,
    transferred_at
  ) VALUES (
    p_equipment_id,
    p_from_location_id,
    p_to_location_id,
    p_previous_status,
    p_new_status,
    p_timestamp
  );
END;
$$ LANGUAGE plpgsql; 