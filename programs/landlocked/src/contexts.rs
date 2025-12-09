use crate::{
    Admin, Registrar, USER_SEED, User, error::ProtocolError, state::{IdNumberClaim, ProtocolState, TitleDeed, TitleForSale}
};
use anchor_lang::prelude::*;
use anchor_lang::solana_program::hash::hash;

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

#[derive(Accounts)]
#[instruction(first_name: String, last_name: String, id_number: String, phone_number: String)]
pub struct CreateUserAccount<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        space = 8 + User::INIT_SPACE,
        seeds = [
            USER_SEED.as_bytes(),
            {hash(id_number.as_bytes()).to_bytes().as_ref()},
            authority.key().as_ref()
        ],
        bump
    )]
    pub user: Account<'info, User>,
    #[account(
        init,
        payer = authority,
        space = 8 + IdNumberClaim::INIT_SPACE,
        seeds = [
            "id_number_claim".as_bytes(),
            {hash(id_number.as_bytes()).to_bytes().as_ref()}
        ],
        bump,
        // If this claim already exists, init will fail, preventing duplicate id_numbers
    )]
    pub id_number_claim: Account<'info, IdNumberClaim>,
    pub system_program: Program<'info, System>,
}

// assign a title deed to a owner
#[derive(Accounts)]
#[instruction(new_owner_address: Pubkey)]
pub struct AssignTitleDeedToOwner<'info> {
    #[account(
        mut,
        constraint = registrar.is_active @ ProtocolError::InvalidRegistrar,
        constraint = registrar.authority == authority.key() @ ProtocolError::InvalidRegistrar
    )]
    pub authority: Signer<'info>, // Must be a registrar
    #[account(
        seeds = [b"registrar", authority.key().as_ref()],
        bump = registrar.bump,
    )]
    pub registrar: Account<'info, Registrar>,
    // TODO: owner must have permitted the transfer(through escrow process)
    #[account(
        init,
        payer = authority,
        space = 8 + TitleDeed::INIT_SPACE,
        seeds = [b"title_deed", new_owner_address.as_ref()],
        bump
    )]
    pub title_deed: Account<'info, TitleDeed>,
    pub owner: Account<'info, User>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(price: u64)]
pub struct MarkTitleForSale<'info> {
    #[account(mut)]
    pub authority: Signer<'info>, // Must be the owner of the title deed
    #[account(
        mut,
        // title deed must be owned by the authority
        constraint = title_deed.authority == authority.key() @ ProtocolError::Unauthorized,
        // seller must be the owner of the title deed
        constraint = title_deed.owner.authority == authority.key() @ ProtocolError::Unauthorized
    )]
    pub title_deed: Account<'info, TitleDeed>,
    #[account(
        // seller must be the authority
        constraint = seller.authority == authority.key() @ ProtocolError::Unauthorized,
        // seller must be the owner of the title deed
        constraint = seller.authority == title_deed.owner.authority @ ProtocolError::Unauthorized
    )]
    pub seller: Account<'info, User>,
    #[account(
        init,
        payer = authority,
        space = 8 + TitleForSale::INIT_SPACE,
        seeds = [b"title_for_sale", seller.authority.key().as_ref(), title_deed.key().as_ref()],
        constraint = authority.key() == title_deed.owner.authority @ ProtocolError::Unauthorized,
        bump
    )]
    pub title_for_sale: Account<'info, TitleForSale>,
    pub system_program: Program<'info, System>,
}
