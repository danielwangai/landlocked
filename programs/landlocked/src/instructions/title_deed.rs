use anchor_lang::prelude::*;
use anchor_lang::AccountDeserialize;

use crate::CancelAgreement;
use crate::{
    contexts::{MarkTitleForSale, SearchTitleDeedByNumber},
    error::ProtocolError,
    state::{AgreementIndex, TitleNumberLookup},
    AssignTitleDeedToOwner, MakeAgreement, SignAgreement,
};

pub fn mark_title_for_sale_handler(ctx: Context<MarkTitleForSale>, price: u64) -> Result<()> {
    let title_deed_key = ctx.accounts.title_deed.key();
    let title_deed = &mut ctx.accounts.title_deed;
    let title_for_sale = &mut ctx.accounts.title_for_sale;
    let clock = Clock::get()?;

    // Mark title as for sale
    title_deed.is_for_sale = true;

    // Store sale listing information
    title_for_sale.title_deed = title_deed_key;
    title_for_sale.seller = (*ctx.accounts.seller).clone();
    title_for_sale.sale_price = price;
    title_for_sale.listed_at = clock.unix_timestamp;
    title_for_sale.bump = ctx.bumps.title_for_sale;

    msg!(
        "Title deed {} marked as for sale at {} lamports by seller {}",
        title_deed.title_number,
        price,
        ctx.accounts.seller.authority
    );
    Ok(())
}

pub fn assign_title_deed_to_owner_handler(
    ctx: Context<AssignTitleDeedToOwner>,
    new_owner_address: Pubkey,
    title_number: String,
    location: String,
    acreage: f64,
    district_land_registry: String,
    registry_mapsheet_number: u64,
) -> Result<()> {
    let title_deed = &mut ctx.accounts.title_deed;
    let clock = Clock::get()?;

    // Update ownership and authority
    title_deed.owner = (*ctx.accounts.owner).clone();
    title_deed.authority = new_owner_address;
    title_deed.title_number = title_number.clone();
    title_deed.location = location;
    title_deed.acreage = acreage;
    title_deed.disctrict_land_registry = district_land_registry;
    title_deed.registry_mapsheet_number = registry_mapsheet_number;
    title_deed.registration_date = clock.unix_timestamp;
    title_deed.is_for_sale = false;
    title_deed.bump = ctx.bumps.title_deed;

    msg!(
        "Title deed {} assigned to new owner {}",
        ctx.accounts.title_deed.title_number,
        new_owner_address
    );

    // Note: title_number_lookup will be created lazily when someone searches for this title

    Ok(())
}

/// Search handler - returns title deed details for a given title_number
/// This allows buyers to search through all title deeds on-chain by title_number
/// Creates the lookup account lazily on first search
pub fn search_title_deed_by_number_handler(ctx: Context<SearchTitleDeedByNumber>) -> Result<()> {
    let title_deed = &ctx.accounts.title_deed;
    
    // Derive PDA for lookup account
    let seeds = &[
        b"title_number_lookup",
        title_deed.title_number.as_bytes(),
    ];
    let (lookup_pda, bump) = Pubkey::find_program_address(seeds, ctx.program_id);
    
    // Validate PDA matches
    require!(
        ctx.accounts.title_number_lookup.key() == lookup_pda,
        ProtocolError::TitleAuthorityMismatch
    );
    
    // Check if account exists and is initialized
    let is_initialized = {
        ctx.accounts.title_number_lookup.lamports() > 0
    }; 
    
    let mut title_number_lookup = if is_initialized {
        // Account exists, deserialize it
        let account_data = ctx.accounts.title_number_lookup.try_borrow_data()?;
        TitleNumberLookup::try_deserialize(&mut &account_data[..])?
    } else {
        // Account doesn't exist yet - create it using CPI to system program
        let rent = anchor_lang::solana_program::rent::Rent::get()?;
        let space = 8 + TitleNumberLookup::INIT_SPACE;
        let lamports_required = rent.minimum_balance(space);
        
        // Create account via CPI
        anchor_lang::solana_program::program::invoke_signed(
            &anchor_lang::solana_program::system_instruction::create_account(
                ctx.accounts.authority.key,
                &lookup_pda,
                lamports_required,
                space as u64,
                ctx.program_id,
            ),
            &[
                ctx.accounts.authority.to_account_info(),
                ctx.accounts.title_number_lookup.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
            &[&[
                b"title_number_lookup",
                title_deed.title_number.as_bytes(),
                &[bump],
            ]],
        )?;

        // Initialize new account
        TitleNumberLookup {
            title_number: title_deed.title_number.clone(),
            title_deed: title_deed.key(),
            searched_by: Pubkey::default(),
            bump,
        }
    };
    
    // Update the searched_by field to track who performed the search
    title_number_lookup.searched_by = ctx.accounts.searched_by.authority;
    
    // Serialize back to account
    let mut account_data = ctx.accounts.title_number_lookup.try_borrow_mut_data()?;
    title_number_lookup.try_serialize(&mut &mut account_data[..])?;

    // Log all title deed properties for the buyer
    msg!(
        "Title Deed Search Result - Number: {}, Location: {}, Acreage: {}, District: {}, Owner: {}, For Sale: {}, Searched By: {}, {}, {}",
        title_deed.title_number,
        title_deed.location,
        title_deed.acreage,
        title_deed.disctrict_land_registry,
        title_deed.owner.authority,
        title_deed.is_for_sale,
        ctx.accounts.searched_by.first_name,
        ctx.accounts.searched_by.last_name,
        ctx.accounts.searched_by.authority
    );

    // The title_deed account is already loaded in the context
    // Client can read all properties: owner, authority, title_number, location,
    // acreage, district_land_registry, registration_date, registry_mapsheet_number, is_for_sale
    Ok(())
}

pub fn make_agreement_handler(ctx: Context<MakeAgreement>, price: u64) -> Result<()> {
    let agreement = &mut ctx.accounts.agreement;
    let title_number_lookup = &ctx.accounts.title_number_lookup;
    let clock = Clock::get()?;

    // Validate that the buyer performed the search
    require!(
        title_number_lookup.searched_by != Pubkey::default(),
        ProtocolError::Unauthorized
    );
    require!(
        title_number_lookup.searched_by == ctx.accounts.buyer.authority,
        ProtocolError::Unauthorized
    );

    // Derive AgreementIndex PDA
    let title_deed_key = ctx.accounts.title_deed.key();
    let agreement_index_seeds = &[b"agreement_index", title_deed_key.as_ref()];
    let (agreement_index_pda, agreement_index_bump) = Pubkey::find_program_address(
        agreement_index_seeds,
        ctx.program_id,
    );
    
    // Validate AgreementIndex PDA matches
    require!(
        ctx.accounts.agreement_index.key() == agreement_index_pda,
        ProtocolError::TitleAuthorityMismatch
    );

    // Check if AgreementIndex already exists and has an active agreement
    let agreement_index_exists = ctx.accounts.agreement_index.lamports() > 0;
    
    if agreement_index_exists {
        // Account exists, check if it has an active agreement
        let agreement_index_data = ctx.accounts.agreement_index.try_borrow_data()?;
        if agreement_index_data.len() >= 8 {
            if let Ok(existing_index) = AgreementIndex::try_deserialize(&mut &agreement_index_data[..]) {
                // If agreement is not default, it means there's already an active agreement - throw error
                if existing_index.agreement != Pubkey::default() {
                    return Err(ProtocolError::AgreementAlreadyExists.into());
                }
            }
        }
    }

    // Store agreement details
    agreement.seller = (*ctx.accounts.seller).clone();
    agreement.buyer = (*ctx.accounts.buyer).clone();
    agreement.title_deed = ctx.accounts.title_deed.key();
    agreement.price = price;
    agreement.created_at = clock.unix_timestamp;
    agreement.drafted_by = ctx.accounts.authority.key();
    agreement.drafted_at = clock.unix_timestamp;
    agreement.bump = ctx.bumps.agreement;

    // Create or update AgreementIndex to enforce one agreement per title deed
    if !agreement_index_exists {
        // Create new AgreementIndex account
        let rent = anchor_lang::solana_program::rent::Rent::get()?;
        let space = 8 + AgreementIndex::INIT_SPACE;
        let lamports_required = rent.minimum_balance(space);
        
        anchor_lang::solana_program::program::invoke_signed(
            &anchor_lang::solana_program::system_instruction::create_account(
                ctx.accounts.authority.key,
                &agreement_index_pda,
                lamports_required,
                space as u64,
                ctx.program_id,
            ),
            &[
                ctx.accounts.authority.to_account_info(),
                ctx.accounts.agreement_index.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
            &[&[
                b"agreement_index",
                title_deed_key.as_ref(),
                &[agreement_index_bump],
            ]],
        )?;
    }

    // Initialize or update AgreementIndex
    let mut agreement_index_account_data = ctx.accounts.agreement_index.try_borrow_mut_data()?;
    
    if agreement_index_exists {
        // Update existing index with new agreement
        let mut index = AgreementIndex::try_deserialize(&mut &agreement_index_account_data[..])?;
        index.agreement = ctx.accounts.agreement.key();
        index.try_serialize(&mut &mut agreement_index_account_data[..])?;
    } else {
        // Initialize new index
        let index = AgreementIndex {
            title_deed: ctx.accounts.title_deed.key(),
            agreement: ctx.accounts.agreement.key(),
            bump: agreement_index_bump,
        };
        index.try_serialize(&mut &mut agreement_index_account_data[..])?;
    }

    msg!(
        "Agreement drafted by {} for {} lamports",
        ctx.accounts.authority.key(),
        price
    );
    Ok(())
}

// land buyer signs the agreement
pub fn sign_agreement_handler(ctx: Context<SignAgreement>) -> Result<()> {
    let agreement = &mut ctx.accounts.agreement;
    let clock = Clock::get()?;

    // Store buyer signature
    agreement.buyer_signature = Some(ctx.accounts.authority.key());
    agreement.buyer_signed_at = Some(clock.unix_timestamp);

    msg!(
        "Agreement signed by buyer {} at {}",
        ctx.accounts.authority.key(),
        clock.unix_timestamp
    );
    Ok(())
}

pub fn cancel_agreement_handler(ctx: Context<CancelAgreement>) -> Result<()> {
    // ensure that the authority is the buyer or seller
    require!(
        ctx.accounts.agreement.seller.authority == ctx.accounts.authority.key() ||
        ctx.accounts.agreement.buyer.authority == ctx.accounts.authority.key(),
        ProtocolError::Unauthorized
    );

    // Todo: how to handle cancellation when in escrow stage?

    // close the agreement account
    ctx.accounts.agreement.close(ctx.accounts.authority.to_account_info())?;

    // TODO: store agreement history for audit purposes
    Ok(())
}
