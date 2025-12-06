use crate::{error::ProtocolError, state::ProtocolState, Admin, Registrar};
use anchor_lang::prelude::*;

// initialize the LandLocked land registry 🔒
#[derive(Accounts)]
pub struct InitializeLandRegistry<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        init,
        payer = payer,
        space = 8 + ProtocolState::INIT_SPACE,
        seeds = [b"protocol_state"], // ensure only one protocol
        bump
    )]
    pub protocol_state: Account<'info, ProtocolState>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ConfirmAdminAccount<'info> {
    #[account(mut)]
    pub authority: Signer<'info>, // admin confirming the account (must match admin.authority)
    #[account(
        init,
        payer = authority,
        space = 8 + Admin::INIT_SPACE,
        seeds = [b"admin", authority.key().as_ref()], // PDA ensures authority can only create their own admin account
        bump
    )]
    pub admin: Account<'info, Admin>,
    pub protocol_state: Account<'info, ProtocolState>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(address: Pubkey)]
pub struct AddRegistrar<'info> {
    #[account(mut)]
    pub authority: Signer<'info>, // authority must be an admin
    #[account(
        init,
        payer = authority,
        space = 8 + Registrar::INIT_SPACE,
        seeds = [b"registrar", address.as_ref()],
        bump
    )]
    pub registrar: Account<'info, Registrar>,
    pub admin: Account<'info, Admin>,
    pub protocol_state: Account<'info, ProtocolState>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ConfirmRegistrarAccount<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [b"registrar", authority.key().as_ref()],
        bump = registrar.bump,
        // registrar must not be already confirmed
        constraint = !registrar.is_active @ ProtocolError::RegistrarAlreadyConfirmed,
    )]
    pub registrar: Account<'info, Registrar>,
    pub protocol_state: Account<'info, ProtocolState>,
}
