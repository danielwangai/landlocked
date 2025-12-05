use crate::{Admin, state::ProtocolState};
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
