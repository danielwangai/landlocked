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
    #[msg("Title not for sale")]
    TitleNotForSale,
    #[msg("Title not marked for sale")]
    TitleNotMarkedForSale,
    #[msg("An agreement already exists for this title deed")]
    AgreementAlreadyExists,
    #[msg("Invalid buyer authority")]
    InvalidBuyerAuthority,
    #[msg("Agreement already cancelled")]
    AgreementAlreadyCancelled,
    #[msg("Agreement not signed by buyer")]
    AgreementNotSignedByBuyer,
    #[msg("Invalid seller")]
    InvalidSeller,
    #[msg("Invalid buyer")]
    InvalidBuyer,
    #[msg("Invalid title deed")]
    InvalidTitleDeed,
    #[msg("Invalid title deed details")]
    InvalidTitleDeedDetails,
}
