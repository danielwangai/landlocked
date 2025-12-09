use anchor_lang::prelude::*;

/// Global protocol configuration and admin controls
#[account]
#[derive(InitSpace)]
pub struct ProtocolState {
    #[max_len(5)]
    pub admins: Vec<Pubkey>,
    pub is_paused: bool, // pause the protocol for maintenance or security issues
    pub bump: u8,
}

/// SuperAdmin accounts are a limited set of accounts that are used to manage the system.
#[account]
#[derive(InitSpace)]
pub struct Admin {
    #[max_len(20)]
    pub first_name: String,
    #[max_len(20)]
    pub last_name: String,
    #[max_len(15)]
    pub id_number: String,
    pub authority: Pubkey,
    pub bump: u8,
}

/// Registrar accounts manage the land registry, land records and processes like land transfers
#[account]
#[derive(InitSpace)]
pub struct Registrar {
    #[max_len(20)]
    pub first_name: String,
    #[max_len(20)]
    pub last_name: String,
    #[max_len(15)]
    pub id_number: String,
    pub authority: Pubkey,
    pub added_by: Pubkey,
    pub is_active: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct User {
    pub bump: u8,
    #[max_len(20)]
    pub first_name: String,
    #[max_len(20)]
    pub last_name: String,
    #[max_len(15)]
    pub id_number: String,
    #[max_len(15)]
    pub phone_number: String,
    pub authority: Pubkey,
}

/// Claim account to ensure id_number uniqueness globally
/// Represents that a specific id_number is claimed by a person
/// PDA: [b"id_number_claim", hash(id_number)]
#[account]
#[derive(InitSpace)]
pub struct IdNumberClaim {
    pub person: Pubkey, // The person account that owns this id_number
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct TitleDeed {
    pub owner: User,
    pub authority: Pubkey,
    #[max_len(15)]
    pub title_number: String,
    #[max_len(100)]
    pub location: String,
    pub acreage: f64,
    #[max_len(100)]
    pub disctrict_land_registry: String,
    pub registration_date: i64,
    pub registry_mapsheet_number: u64,
    pub is_for_sale: bool,
    pub bump: u8,
}

/// Sale listing for a title deed
/// PDA: [b"title_for_sale", title_deed.key().as_ref()]
#[account]
#[derive(InitSpace)]
pub struct TitleForSale {
    pub title_deed: Pubkey,  // Reference to the title deed being sold
    pub seller: User,        // Seller's user account details
    pub sale_price: u64,     // Price in lamports (smallest unit of SOL)
    pub listed_at: i64,      // Timestamp when listed for sale
    pub bump: u8,
}
