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
    pub is_for_sale: bool, // TODO: remove this field
    pub bump: u8,
}

/// Sale listing for a title deed
/// PDA: [b"title_for_sale", title_deed.key().as_ref()]
#[account]
#[derive(InitSpace)]
pub struct TitleForSale {
    pub title_deed: Pubkey, // Reference to the title deed being sold
    pub seller: User,       // Seller's user account details
    pub sale_price: u64,    // Price in lamports (smallest unit of SOL)
    pub listed_at: i64,     // Timestamp when listed for sale
    pub bump: u8,
}

/// Index mapping title_number to TitleDeed account address for search
/// PDA: [b"title_number_index", title_number.as_bytes()]
#[account]
#[derive(InitSpace)]
pub struct TitleNumberLookup {
    #[max_len(15)]
    pub title_number: String, // The title number being indexed
    pub title_deed: Pubkey, // Address of the TitleDeed account
    pub searched_by: Pubkey,  // The authority/pubkey of the user who searched (Pubkey::default() until first search)
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Agreement {
    pub seller: User,
    pub buyer: User,
    pub title_deed: Pubkey,
    pub price: u64,
    pub created_at: i64,
    pub drafted_by: Pubkey,
    pub buyer_confirmation: Option<Pubkey>,
    pub drafted_at: i64,
    pub buyer_confirmed_at: Option<i64>,
    pub bump: u8,
}

/// Index to enforce one agreement per title deed
/// PDA: [b"agreement_index", title_deed.key().as_ref()]
#[account]
#[derive(InitSpace)]
pub struct AgreementIndex {
    pub title_deed: Pubkey,
    pub agreement: Pubkey, // The active agreement for this title deed
    pub bump: u8,
}
