use crate::{
    Admin, Agreement, Deposit, EscrowState, Registrar, USER_SEED, User, error::ProtocolError, state::{
        AgreementIndex, Escrow, IdNumberClaim, ProtocolState, TitleDeed, TitleForSale,
        TitleNumberLookup,
    }
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
#[instruction(new_owner_address: Pubkey, title_number: String)]
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

/// Search title deed by title_number
/// This allows buyers to search for title deeds by their title number
// TODO: should search be done only on land/titles marked for sale?
#[derive(Accounts)]
#[instruction(title_number: String)]
pub struct SearchTitleDeedByNumber<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    /// Title deed being searched - caller must provide this
    #[account(
        constraint = title_deed.title_number == title_number @ ProtocolError::TitleAuthorityMismatch
    )]
    pub title_deed: Account<'info, TitleDeed>,
    /// Lookup account - created lazily on first search
    /// Account may not exist yet - handler will create it if needed
    /// CHECK: Account may not be initialized yet - handler will check and create if needed
    #[account(mut)]
    pub title_number_lookup: UncheckedAccount<'info>,
    #[account(
        mut,
        constraint = searched_by.authority == authority.key() @ ProtocolError::Unauthorized
    )]
    pub searched_by: Account<'info, User>,
    pub system_program: Program<'info, System>,
}

// Make an agreement for the sale of a title deed
// we have many checks(constraints) to ensure that due process is followed
// to reduce risk of fraud and potential disputes since land issues are sensitive.
// TODO: time bound agreements - if no escrow is created within the time limit, the agreement is void.
#[derive(Accounts)]
#[instruction(price: u64)]
pub struct MakeAgreement<'info> {
    #[account(mut,
        constraint = title_deed.authority == authority.key() @ ProtocolError::Unauthorized
    )]
    pub authority: Signer<'info>, // Must be the seller of the title deed - current land owner drafts the agreement
    #[account(
        mut,
        // title deed for the land being sold must match the searched title deed
        constraint = title_deed.key() == title_number_lookup.title_deed.key() @ ProtocolError::TitleNotMarkedForSale
    )]
    pub title_deed: Account<'info, TitleDeed>,
    #[account(
        mut,
        seeds = [b"title_for_sale", authority.key().as_ref(), title_deed.key().as_ref()],
        bump = title_for_sale.bump,
        // title marked for sale must be the same as the title deed in the agreement
        constraint = title_for_sale.title_deed == title_deed.key() @ ProtocolError::TitleNotMarkedForSale
    )]
    pub title_for_sale: Account<'info, TitleForSale>,
    #[account(
        mut,
        // seller must be the authority to initiate the agreement
        constraint = seller.authority == authority.key() @ ProtocolError::Unauthorized,
        // seller must match the seller in the title marked for sale
        constraint = seller.authority == title_for_sale.seller.authority @ ProtocolError::Unauthorized
    )]
    pub seller: Account<'info, User>,
    // TODO: add constraint for buyer
    pub buyer: Account<'info, User>,
    // TODO: allow multiple searches for the same title number
    #[account(
        mut,
        seeds = [b"title_number_lookup", title_deed.title_number.as_bytes()],
        bump = title_number_lookup.bump,
        constraint = title_number_lookup.title_number == title_deed.title_number @ ProtocolError::TitleNotMarkedForSale
    )]
    pub title_number_lookup: Account<'info, TitleNumberLookup>,
    #[account(
        init,
        payer = authority,
        space = 8 + Agreement::INIT_SPACE,
        seeds = [b"agreement", authority.key().as_ref(), buyer.authority.key().as_ref(), title_deed.key().as_ref(), price.to_le_bytes().as_ref()],
        bump
    )]
    pub agreement: Account<'info, Agreement>,
    /// CHECK: AgreementIndex may already exist - handler will check and throw AgreementAlreadyExists if needed
    /// PDA validation ensures correct account is passed
    #[account(
        mut,
        seeds = [b"agreement_index", title_deed.key().as_ref()],
        bump
    )]
    pub agreement_index: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(price: u64)]
pub struct SignAgreement<'info> {
    #[account(mut)]
    pub authority: Signer<'info>, // Must be the buyer of the agreement
    #[account(
        mut,
        constraint = title_deed.key() == agreement.title_deed @ ProtocolError::InvalidTitleDeed
    )]
    pub title_deed: Account<'info, TitleDeed>,
    #[account(
        mut,
        seeds = [b"agreement", agreement.seller.authority.as_ref(), agreement.buyer.authority.as_ref(), title_deed.key().as_ref(), price.to_le_bytes().as_ref()],
        bump = agreement.bump,
        constraint = agreement.buyer.authority == authority.key() @ ProtocolError::Unauthorized,
        constraint = agreement.price == price @ ProtocolError::InvalidTitleDeed
    )]
    pub agreement: Account<'info, Agreement>,
}

#[derive(Accounts)]
pub struct CancelAgreement<'info> {
    // must be buyer or seller
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        mut,
        close = authority,
    )]
    pub agreement: Account<'info, Agreement>,
    #[account(
        mut,
        seeds = [b"agreement_index", agreement.title_deed.as_ref()],
        close = authority,
        bump
    )]
    pub agreement_index: Account<'info, AgreementIndex>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateEscrow<'info> {
    #[account(
        mut,
        constraint = authority.key() == title_deed.authority @ ProtocolError::Unauthorized,
    )]
    pub authority: Signer<'info>, // this is the seller(current land owner)
    // title deeed
    #[account(mut)]
    pub title_deed: Account<'info, TitleDeed>,
    // agreement - must be signed by the buyer
    #[account(
        mut,
        constraint = agreement.buyer.authority == buyer.authority.key() @ ProtocolError::Unauthorized
    )]
    pub agreement: Account<'info, Agreement>,
    pub seller: Account<'info, User>,
    pub buyer: Account<'info, User>,
    #[account(
        init,
        payer = authority,
        space = 8 + Escrow::INIT_SPACE,
        seeds = [b"escrow", agreement.key().as_ref()],
        bump
    )]
    pub escrow: Account<'info, Escrow>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DepositPaymentToEscrow<'info> {
    #[account(
        mut,
        constraint = authority.key() == buyer.authority.key() @ ProtocolError::Unauthorized,
    )]
    pub authority: Signer<'info>, // must be the buyer
    #[account(
        mut,
        constraint = escrow.buyer == authority.key() @ ProtocolError::Unauthorized,
    )]
    pub buyer: Account<'info, User>,
    pub seller: Account<'info, User>,
    #[account(
        mut,
        constraint = escrow.buyer == buyer.authority.key() @ ProtocolError::Unauthorized,
        constraint = escrow.agreement == agreement.key() @ ProtocolError::InvalidAgreement,
    )]
    pub escrow: Account<'info, Escrow>,
    pub agreement: Account<'info, Agreement>,
    #[account(
        init,
        payer = authority,
        space = 8 + Deposit::INIT_SPACE,
        seeds = [b"deposit", escrow.key().as_ref()],
        bump
    )]
    pub deposit: Account<'info, Deposit>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AuthorizeEscrow<'info> {
    #[account(
        mut,
        // must be registrar
    )]
    pub authority: Signer<'info>,
    #[account(
        seeds = [b"registrar", authority.key().as_ref()],
        bump = registrar.bump,
    )]
    pub registrar: Account<'info, Registrar>,
    #[account(
        mut,
        // escrow state must be PaymentDeposited (both title and payment deposited)
        constraint = escrow.state == EscrowState::PaymentDeposited @ ProtocolError::EscrowNotReadyForPayment,
    )]
    pub escrow: Account<'info, Escrow>,
    #[account(
        mut,
        seeds = [b"deposit", escrow.key().as_ref()],
        bump = deposit.bump,
    )]
    pub deposit: Account<'info, Deposit>,
    #[account(mut)]
    pub title_deed: Account<'info, TitleDeed>,
    pub title_for_sale: Account<'info, TitleForSale>,
    pub agreement: Account<'info, Agreement>,
    pub title_number_lookup: Account<'info, TitleNumberLookup>,
    pub buyer: Account<'info, User>,
    pub seller: Account<'info, User>,
    /// CHECK: Seller's authority account (wallet) - used to receive funds
    #[account(mut)]
    pub seller_authority: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}
