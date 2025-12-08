use anchor_lang::prelude::*;

use crate::contexts::CreateUserAccount;

pub fn create_user_account_handler(
    ctx: Context<CreateUserAccount>,
    first_name: String,
    last_name: String,
    id_number: String,
    phone_number: String,
) -> Result<()> {
    // create the user account
    let user = &mut ctx.accounts.user;
    user.authority = ctx.accounts.authority.key();
    user.first_name = first_name;
    user.last_name = last_name;
    user.id_number = id_number.clone();
    user.phone_number = phone_number;
    user.bump = ctx.bumps.user;

    // Initialize the id_number claim to prevent duplicates
    // If this id_number was already claimed, the init will fail with "account already in use"
    let claim = &mut ctx.accounts.id_number_claim;
    claim.person = ctx.accounts.user.key();
    claim.bump = ctx.bumps.id_number_claim;

    Ok(())
}
