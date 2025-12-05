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
