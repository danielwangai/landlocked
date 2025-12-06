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
