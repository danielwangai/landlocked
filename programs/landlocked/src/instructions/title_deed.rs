use anchor_lang::prelude::*;

use crate::{AssignTitleDeedToOwner, contexts::{MarkTitleForSale, SearchTitleDeedByNumber}, error::ProtocolError};

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
    let title_number_lookup = &mut ctx.accounts.title_number_lookup;
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

    // Create search index mapping title_number to title_deed address
    title_number_lookup.title_number = title_number;
    title_number_lookup.title_deed = ctx.accounts.title_deed.key();
    title_number_lookup.bump = ctx.bumps.title_number_lookup;

    msg!(
        "Title deed {} assigned to new owner {} and indexed for search",
        ctx.accounts.title_deed.title_number,
        new_owner_address
    );

    Ok(())
}

/// Search handler - returns title deed details for a given title_number
/// This allows buyers to search through all title deeds on-chain by title_number
pub fn search_title_deed_by_number_handler(ctx: Context<SearchTitleDeedByNumber>) -> Result<()> {
    let title_deed = &ctx.accounts.title_deed;
    
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
        ctx.accounts.searched_by.authority,
    );
    
    // The title_deed account is already loaded in the context
    // Client can read all properties: owner, authority, title_number, location, 
    // acreage, district_land_registry, registration_date, registry_mapsheet_number, is_for_sale
    Ok(())
}
