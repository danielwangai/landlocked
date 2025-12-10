use anchor_lang::prelude::*;

#[error_code]
pub enum ProtocolError {
    #[msg("Invalid admin account")]
    InvalidAdmin,
    #[msg("Registrar already exists")]
    RegistrarAlreadyExists,
    #[msg("Registrar already confirmed")]
    RegistrarAlreadyConfirmed,
    #[msg("Invalid registrar account")]
    InvalidRegistrar,
    #[msg("ID number already exists")]
    DuplicateIdNumber,
    #[msg("Unauthorized: Only the owner can perform this action")]
    Unauthorized,
    #[msg("Title deed address mismatch")]
    TitleAuthorityMismatch,
}
