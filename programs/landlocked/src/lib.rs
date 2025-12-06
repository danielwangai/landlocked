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

declare_id!("4AYNJr9c5E2MgtKd2RGsSdSRfEcLfNWm2og83MeFchYv");

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
}
