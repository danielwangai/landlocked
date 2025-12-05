use crate::{contexts::InitializeLandRegistry, error::ProtocolError};
use anchor_lang::prelude::*;

pub fn handler(ctx: Context<InitializeLandRegistry>, admins: Vec<Pubkey>) -> Result<()> {
    // Validate that the payer is one of the predefined admins
    require!(
        admins.contains(&ctx.accounts.payer.key()),
        ProtocolError::InvalidAdmin
    );

    // Validate admin list constraints
    require!(admins.len() <= 5, ProtocolError::InvalidAdmin);
    require!(!admins.is_empty(), ProtocolError::InvalidAdmin);

    // Initialize the protocol state with the admin list
    let protocol_state = &mut ctx.accounts.protocol_state;
    protocol_state.admins = admins;
    protocol_state.is_paused = false;
    protocol_state.bump = ctx.bumps.protocol_state;

    msg!("Protocol initialized with {} admins", protocol_state.admins.len());
    Ok(())
}
