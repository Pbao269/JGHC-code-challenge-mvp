export type BuildingType = "classroom" | "office" | "warehouse";
export type WarehouseStatus = "stored" | "maintenance" | "replaced";
export type UsageStatus = "in-use" | "need-replacement";
export type EquipmentStatus = WarehouseStatus | UsageStatus;
export type DeleteReason = "broken" | "obsolete" | "other";

export interface Database {
  public: {
    Tables: {
      equipment: {
        Row: {
          id: string;
          model: string;
          equipment_type: string;
          serial_number: string;
          date_imported: string;
          status: EquipmentStatus;
          date_added: string;
          last_updated: string;
          delete_reason?: string | null;
          delete_note?: string | null;
        };
        Insert: {
          id?: string;
          model: string;
          equipment_type: string;
          serial_number: string;
          date_imported: string;
          status?: EquipmentStatus;
          date_added?: string;
          last_updated?: string;
          delete_reason?: string | null;
          delete_note?: string | null;
        };
        Update: {
          id?: string;
          model?: string;
          equipment_type?: string;
          serial_number?: string;
          date_imported?: string;
          status?: EquipmentStatus;
          date_added?: string;
          last_updated?: string;
          delete_reason?: string | null;
          delete_note?: string | null;
        };
      };
      locations: {
        Row: {
          id: string;
          room_name: string;
          building_type: BuildingType;
          created_at: string;
        };
        Insert: {
          id?: string;
          room_name: string;
          building_type: BuildingType;
          created_at?: string;
        };
        Update: {
          id?: string;
          room_name?: string;
          building_type?: BuildingType;
          created_at?: string;
        };
      };
      equipment_location: {
        Row: {
          equipment_id: string;
          location_id: string;
          updated_at: string;
        };
        Insert: {
          equipment_id: string;
          location_id: string;
          updated_at?: string;
        };
        Update: {
          equipment_id?: string;
          location_id?: string;
          updated_at?: string;
        };
      };
      equipment_transfer_history: {
        Row: {
          id: string;
          equipment_id: string;
          from_location_id: string;
          to_location_id: string;
          previous_status: EquipmentStatus;
          new_status: EquipmentStatus;
          transferred_at: string;
        };
        Insert: {
          id?: string;
          equipment_id: string;
          from_location_id: string;
          to_location_id: string;
          previous_status: EquipmentStatus;
          new_status: EquipmentStatus;
          transferred_at?: string;
        };
        Update: {
          id?: string;
          equipment_id?: string;
          from_location_id?: string;
          to_location_id?: string;
          previous_status?: EquipmentStatus;
          new_status?: EquipmentStatus;
          transferred_at?: string;
        };
      };
    };
    Views: {
      equipment_with_location: {
        Row: {
          id: string;
          model: string;
          equipment_type: string;
          serial_number: string;
          date_imported: string;
          status: EquipmentStatus;
          date_added: string;
          last_updated: string;
          delete_reason?: string | null;
          delete_note?: string | null;
          location_id: string;
          room_name: string;
          building_type: BuildingType;
        };
      };
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
} 