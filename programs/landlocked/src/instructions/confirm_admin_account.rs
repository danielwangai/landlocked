use anchor_lang::prelude::*;
use crate::{contexts::ConfirmAdminAccount, error::ProtocolError, state::ProtocolState};

pub fn handler(ctx: Context<ConfirmAdminAccount>) -> Result<()> {
    // ensure that one admin cannot confirm an account of another admin
    // Validate that the authority is one of the predefined admins in protocol state
    validate_admin(
        ctx.accounts.authority.key(),
        &ctx.accounts.protocol_state,
    )?;
    
    // Set the admin account authority
    let admin = &mut ctx.accounts.admin;
    admin.authority = ctx.accounts.authority.key();
    admin.bump = ctx.bumps.admin;
    
    Ok(())
}

fn validate_admin(authority: Pubkey, protocol_state: &ProtocolState) -> Result<()> {
    require!(
        protocol_state.admins.contains(&authority),
        ProtocolError::InvalidAdmin
    );
    Ok(())
}
