use anchor_lang::prelude::*;

use crate::{error::ProtocolError, is_admin, AddRegistrar, ConfirmRegistrarAccount};

// Admin adds a registrar address (creates account, not active yet)
pub fn add_registrar_handler(
    ctx: Context<AddRegistrar>,
    address: Pubkey,
    first_name: String,
    last_name: String,
    id_number: String,
) -> Result<()> {
    // validate that the authority is an admin
    is_admin(ctx.accounts.authority.key(), &ctx.accounts.protocol_state)?;

    // initialize the registrar account (not active, waiting for confirmation)
    let registrar = &mut ctx.accounts.registrar;
    registrar.authority = address;
    registrar.added_by = ctx.accounts.authority.key();
    registrar.is_active = false;
    registrar.id_number = id_number.clone();
    registrar.first_name = first_name.clone();
    registrar.last_name = last_name.clone();
    registrar.bump = ctx.bumps.registrar;

    msg!("Registrar account created for address: {}", address);
    Ok(())
}

pub fn confirm_registrar_handler(ctx: Context<ConfirmRegistrarAccount>) -> Result<()> {
    // Ensure the signer/authority matches the registrar address
    require!(
        ctx.accounts.authority.key() == ctx.accounts.registrar.authority,
        ProtocolError::InvalidRegistrar
    );

    // Update registrar and activate
    let registrar = &mut ctx.accounts.registrar;
    registrar.is_active = true;

    msg!(
        "Registrar account confirmed and activated for: {}",
        ctx.accounts.authority.key()
    );
    Ok(())
}
