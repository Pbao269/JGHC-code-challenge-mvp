// import { supabase } from './supabase';


// export async function initializeDatabaseSchema(): Promise<boolean> {
//   try {
//     console.log('Initializing database schema...');
    
//     // Enable UUID extension
//     try {
//       await supabase.rpc('extensions', {
//         input_string: 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'
//       });
//       console.log('UUID extension enabled');
//     } catch (e) {
//       console.error('Error enabling UUID extension:', e);
//       // Continue anyway, might already be enabled
//     }
    
//     // Create equipment_status enum if not exists
//     try {
//       await supabase.rpc('create_enum_if_not_exists', {
//         enum_name: 'equipment_status',
//         enum_values: ['stored', 'maintenance', 'replaced', 'in-use', 'need-replacement']
//       });
//       console.log('equipment_status enum created');
//     } catch (e) {
//       console.error('Error creating equipment_status enum:', e);
//       // Try a different approach - check if enum exists by using it
//       const { error } = await supabase.from('equipment').select('id').eq('status', 'stored').limit(1);
//       if (error && error.code === '42P01') {
//         console.log('Equipment table doesn\'t exist yet, will be created later');
//       } else if (error && error.code === '42703') {
//         console.error('equipment_status enum might not exist');
//         return false;
//       }
//     }
    
//     // Create building_type enum if not exists
//     try {
//       await supabase.rpc('create_enum_if_not_exists', {
//         enum_name: 'building_type',
//         enum_values: ['classroom', 'office', 'warehouse']
//       });
//       console.log('building_type enum created');
//     } catch (e) {
//       console.error('Error creating building_type enum:', e);
//       // Try a different approach
//       const { error } = await supabase.from('locations').select('id').eq('building_type', 'warehouse').limit(1);
//       if (error && error.code === '42P01') {
//         console.log('Locations table doesn\'t exist yet, will be created later');
//       } else if (error && error.code === '42703') {
//         console.error('building_type enum might not exist');
//         return false;
//       }
//     }
    
//     // Create delete_reason enum if not exists
//     try {
//       await supabase.rpc('create_enum_if_not_exists', {
//         enum_name: 'delete_reason',
//         enum_values: ['broken', 'obsolete', 'other']
//       });
//       console.log('delete_reason enum created');
//     } catch (e) {
//       console.error('Error creating delete_reason enum:', e);
//       // Continue anyway, will fail properly later if critical
//     }
    
//     // Create equipment table
//     try {
//       await supabase.rpc('execute_sql', {
//         sql_string: `
//           CREATE TABLE IF NOT EXISTS equipment (
//             id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
//             model VARCHAR(255) NOT NULL,
//             equipment_type VARCHAR(50) NOT NULL,
//             serial_number VARCHAR(100) NOT NULL,
//             date_imported VARCHAR(10) NOT NULL,
//             status VARCHAR(20) NOT NULL DEFAULT 'stored',
//             date_added TIMESTAMPTZ NOT NULL DEFAULT NOW(),
//             last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
//             delete_reason VARCHAR(20),
//             delete_note TEXT
//           );
//         `
//       });
//       console.log('Equipment table created');
//     } catch (e) {
//       console.error('Error creating equipment table:', e);
//       return false;
//     }
    
//     // Create locations table
//     try {
//       await supabase.rpc('execute_sql', {
//         sql_string: `
//           CREATE TABLE IF NOT EXISTS locations (
//             id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
//             room_name VARCHAR(255) NOT NULL UNIQUE,
//             building_type VARCHAR(20) NOT NULL,
//             created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
//           );
//         `
//       });
//       console.log('Locations table created');
//     } catch (e) {
//       console.error('Error creating locations table:', e);
//       return false;
//     }
    
//     // Create equipment_location table
//     try {
//       await supabase.rpc('execute_sql', {
//         sql_string: `
//           CREATE TABLE IF NOT EXISTS equipment_location (
//             equipment_id UUID PRIMARY KEY REFERENCES equipment(id) ON DELETE CASCADE,
//             location_id UUID NOT NULL REFERENCES locations(id),
//             updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
//           );
//         `
//       });
//       console.log('Equipment location table created');
//     } catch (e) {
//       console.error('Error creating equipment_location table:', e);
//       return false;
//     }
    
//     // Create equipment_transfer_history table
//     try {
//       await supabase.rpc('execute_sql', {
//         sql_string: `
//           CREATE TABLE IF NOT EXISTS equipment_transfer_history (
//             id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
//             equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
//             from_location_id UUID NOT NULL REFERENCES locations(id),
//             to_location_id UUID NOT NULL REFERENCES locations(id),
//             previous_status VARCHAR(20) NOT NULL,
//             new_status VARCHAR(20) NOT NULL,
//             transferred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
//           );
//         `
//       });
//       console.log('Equipment transfer history table created');
//     } catch (e) {
//       console.error('Error creating equipment_transfer_history table:', e);
//       return false;
//     }
    
//     // Create equipment_with_location view
//     try {
//       await supabase.rpc('execute_sql', {
//         sql_string: `
//           CREATE OR REPLACE VIEW equipment_with_location AS
//             SELECT 
//               e.id,
//               e.model,
//               e.equipment_type,
//               e.serial_number,
//               e.date_imported,
//               e.status,
//               e.date_added,
//               e.last_updated,
//               e.delete_reason,
//               e.delete_note,
//               el.location_id,
//               l.room_name,
//               l.building_type
//             FROM 
//               equipment e
//             JOIN 
//               equipment_location el ON e.id = el.equipment_id
//             JOIN 
//               locations l ON el.location_id = l.id;
//         `
//       });
//       console.log('Equipment with location view created');
//     } catch (e) {
//       console.error('Error creating equipment_with_location view:', e);
//       return false;
//     }
    
//     // Create transfer_equipment function
//     try {
//       await supabase.rpc('execute_sql', {
//         sql_string: `
//           CREATE OR REPLACE FUNCTION transfer_equipment(
//             p_equipment_id UUID,
//             p_to_location_id UUID,
//             p_from_location_id UUID,
//             p_previous_status VARCHAR(20),
//             p_new_status VARCHAR(20),
//             p_timestamp TIMESTAMPTZ
//           )
//           RETURNS VOID AS $$
//           BEGIN
//             -- Update equipment status
//             UPDATE equipment
//             SET 
//               status = p_new_status,
//               last_updated = p_timestamp
//             WHERE 
//               id = p_equipment_id;
              
//             -- Update equipment location
//             UPDATE equipment_location
//             SET 
//               location_id = p_to_location_id,
//               updated_at = p_timestamp
//             WHERE 
//               equipment_id = p_equipment_id;
              
//             -- Record the transfer in history
//             INSERT INTO equipment_transfer_history (
//               equipment_id,
//               from_location_id,
//               to_location_id,
//               previous_status,
//               new_status,
//               transferred_at
//             ) VALUES (
//               p_equipment_id,
//               p_from_location_id,
//               p_to_location_id,
//               p_previous_status,
//               p_new_status,
//               p_timestamp
//             );
//           END;
//           $$ LANGUAGE plpgsql;
//         `
//       });
//       console.log('Transfer equipment function created');
//     } catch (e) {
//       console.error('Error creating transfer_equipment function:', e);
//       return false;
//     }
    
//     console.log('Database schema initialization completed successfully');
//     return true;
//   } catch (error) {
//     console.error('Error initializing database schema:', error);
//     return false;
//   }
// } 