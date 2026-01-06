pub mod constants;
pub mod contexts;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use contexts::*;
pub use instructions::*;
pub use state::*;

declare_id!("39fc7eg4u6F3S4Y3MaWn6HSSFNrHMYNgGwy6tW5Dh3QQ");

#[program]
pub mod landlocked {
    use super::*;

    pub fn initialize(ctx: Context<InitializeLandRegistry>, admins: Vec<Pubkey>) -> Result<()> {
        initialize::handler(ctx, admins)
    }

    pub fn confirm_admin_account(ctx: Context<ConfirmAdminAccount>) -> Result<()> {
        confirm_admin_account::handler(ctx)
    }

    pub fn add_registrar(
        ctx: Context<AddRegistrar>,
        address: Pubkey,
        first_name: String,
        last_name: String,
        id_number: String,
    ) -> Result<()> {
        registrar::add_registrar_handler(ctx, address, first_name, last_name, id_number)
    }

    pub fn confirm_registrar_account(ctx: Context<ConfirmRegistrarAccount>) -> Result<()> {
        registrar::confirm_registrar_handler(ctx)
    }

    pub fn create_user_account(
        ctx: Context<CreateUserAccount>,
        first_name: String,
        last_name: String,
        id_number: String,
        phone_number: String,
    ) -> Result<()> {
        user::create_user_account_handler(ctx, first_name, last_name, id_number, phone_number)
    }

    pub fn mark_title_for_sale(ctx: Context<MarkTitleForSale>, price: u64) -> Result<()> {
        title_deed::mark_title_for_sale_handler(ctx, price)
    }

    pub fn assign_title_deed_to_owner(
        ctx: Context<AssignTitleDeedToOwner>,
        new_owner_address: Pubkey,
        title_number: String,
        location: String,
        acreage: f64,
        district_land_registry: String,
        registry_mapsheet_number: u64,
    ) -> Result<()> {
        title_deed::assign_title_deed_to_owner_handler(
            ctx,
            new_owner_address,
            title_number,
            location,
            acreage,
            district_land_registry,
            registry_mapsheet_number,
        )
    }

    pub fn search_title_deed_by_number(ctx: Context<SearchTitleDeedByNumber>, title_number: String) -> Result<()> {
        title_deed::search_title_deed_by_number_handler(ctx)
    }

    pub fn make_agreement(ctx: Context<MakeAgreement>, price: u64) -> Result<()> {
        title_deed::make_agreement_handler(ctx, price)
    }

    pub fn sign_agreement(ctx: Context<SignAgreement>, price: u64) -> Result<()> {
        title_deed::sign_agreement_handler(ctx, price)
    }

    pub fn cancel_agreement(ctx: Context<CancelAgreement>) -> Result<()> {
        title_deed::cancel_agreement_handler(ctx)
    }

    pub fn create_escrow(ctx: Context<CreateEscrow>) -> Result<()> {
        title_deed::create_escrow_handler(ctx)
    }

    pub fn deposit_payment_to_escrow(
        ctx: Context<DepositPaymentToEscrow>,
        amount: u64,
    ) -> Result<()> {
        title_deed::deposit_payment_to_escrow_handler(ctx, amount)
    }

    pub fn authorize_escrow(ctx: Context<AuthorizeEscrow>) -> Result<()> {
        title_deed::authorize_escrow_handler(ctx)
    }
}
