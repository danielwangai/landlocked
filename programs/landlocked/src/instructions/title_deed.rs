use anchor_lang::prelude::*;

use crate::{AssignTitleDeedToOwner, contexts::MarkTitleForSale, error::ProtocolError};

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

pub fn assign_title_deed_to_owner_handler(ctx: Context<AssignTitleDeedToOwner>, new_owner_address: Pubkey) -> Result<()> {
    let title_deed = &mut ctx.accounts.title_deed;

    // Update ownership and authority
    title_deed.owner = (*ctx.accounts.owner).clone();
    title_deed.authority = new_owner_address;
    title_deed.is_for_sale = false;
    title_deed.bump = ctx.bumps.title_deed;

    msg!(
        "Title deed assigned to new owner {}",
        new_owner_address
    );

    Ok(())
}
