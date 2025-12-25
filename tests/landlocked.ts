import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import * as assert from "assert";
import { Landlocked } from "../target/types/landlocked";
import crypto from "crypto";
import { BN } from "@coral-xyz/anchor";

describe("landlocked", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.landlocked as Program<Landlocked>;

  // Protocol admins
  const admin1 = anchor.web3.Keypair.generate();
  const admin2 = anchor.web3.Keypair.generate();
  const registrar1 = anchor.web3.Keypair.generate();
  const registrar2 = anchor.web3.Keypair.generate();
  const fakeAdmin = anchor.web3.Keypair.generate();
  let protocolState: PublicKey;

  // PDA accounts
  let admin1PDA: PublicKey;
  let admin2PDA: PublicKey;
  let registrar1PDA: PublicKey;
  let registrar2PDA: PublicKey;
  let fakeAdminPDA: PublicKey;
  // title2 PDA
  let titleDeed2PDA: PublicKey;
  // lookup PDA for title2
  let title2NumberLookupPDA: PublicKey;

  // protocol state PDA
  [protocolState] = PublicKey.findProgramAddressSync(
    [Buffer.from("protocol_state")],
    program.programId
  );

  // admin1 PDA
  [admin1PDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("admin"), admin1.publicKey.toBuffer()],
    program.programId
  );

  // admin2 PDA
  [admin2PDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("admin"), admin2.publicKey.toBuffer()],
    program.programId
  );

  // fake admin PDA
  [fakeAdminPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("admin"), fakeAdmin.publicKey.toBuffer()],
    program.programId
  );

  // land owners
  const owner1 = anchor.web3.Keypair.generate();
  const owner2 = anchor.web3.Keypair.generate();

  const owner1Details = {
    firstName: "John",
    lastName: "Doe",
    idNumber: "1234567890",
    phoneNumber: "+254700000000",
    address: owner1.publicKey,
    titleNumber: "1234567890",
    location: "Nairobi",
    acreage: 100,
    districtLandRegistry: "Nairobi",
    registryMapsheetNumber: new BN(473287583),
  };
  const owner2Details = {
    firstName: "Jane",
    lastName: "Smith",
    idNumber: "94389892343",
    phoneNumber: "+254700000001",
    address: owner2.publicKey,
    titleNumber: "342343243",
    location: "Kisumu",
    acreage: 10,
    districtLandRegistry: "Kisumu",
    registryMapsheetNumber: new BN(2148841545),
  };

  // registrar details
  const registrar1Details = {
    firstName: "Kim",
    lastName: "Doe",
    idNumber: "1234567890",
  };

  const registrar2Details = {
    firstName: "Job",
    lastName: "Smith",
    idNumber: "94389892343",
  };

  let owner1PDA: PublicKey;
  let owner2PDA: PublicKey;
  let owner1IdNumberClaimPDA: PublicKey;
  let owner2IdNumberClaimPDA: PublicKey;

  before(async () => {
    // airdrop SOL to the admins
    await airdrop(admin1.publicKey, 1_000_000_000);
    await airdrop(admin2.publicKey, 1_000_000_000);
    await airdrop(fakeAdmin.publicKey, 1_000_000_000);
    await airdrop(registrar1.publicKey, 1_000_000_000);
    await airdrop(registrar2.publicKey, 1_000_000_000);

    // initialize the protocol
    await program.methods
      .initialize([admin1.publicKey, admin2.publicKey])
      .accounts({
        payer: admin1.publicKey,
        protocolState,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([admin1])
      .rpc();

    // confirm admin1 account
    await program.methods
      .confirmAdminAccount()
      .accounts({
        authority: admin1.publicKey,
        admin: admin1PDA,
        protocolState,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([admin1])
      .rpc();

    // Compute PDAs inside before hook
    owner1PDA = getUserAddress(owner1Details.idNumber, owner1.publicKey);
    owner2PDA = getUserAddress(owner2Details.idNumber, owner2.publicKey);
    owner1IdNumberClaimPDA = getIdNumberClaimPDA(owner1Details.idNumber);
    owner2IdNumberClaimPDA = getIdNumberClaimPDA(owner2Details.idNumber);
    registrar1PDA = getRegistrarPDA(registrar1.publicKey);
    registrar2PDA = getRegistrarPDA(registrar2.publicKey);

    await airdrop(owner1.publicKey, 1_000_000_000);
    await program.methods
      .createUserAccount(
        owner1Details.firstName,
        owner1Details.lastName,
        owner1Details.idNumber,
        owner1Details.phoneNumber
      )
      .accounts({
        authority: owner1.publicKey,
        user: owner1PDA,
        idNumberClaim: owner1IdNumberClaimPDA,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([owner1])
      .rpc();

    await airdrop(owner2.publicKey, 1_000_000_000);
    await program.methods
      .createUserAccount(
        owner2Details.firstName,
        owner2Details.lastName,
        owner2Details.idNumber,
        owner2Details.phoneNumber
      )
      .accounts({
        authority: owner2.publicKey,
        user: owner2PDA,
        idNumberClaim: owner2IdNumberClaimPDA,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([owner2])
      .rpc();

    // add registrar2
    await program.methods
      .addRegistrar(
        registrar2.publicKey,
        registrar2Details.firstName,
        registrar2Details.lastName,
        registrar2Details.idNumber
      )
      .accounts({
        authority: admin1.publicKey,
        registrar: registrar2PDA,
        admin: admin1PDA,
        protocolState,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([admin1])
      .rpc();

    // Confirm registrar2
    await program.methods
      .confirmRegistrarAccount()
      .accounts({
        authority: registrar2.publicKey,
        registrar: registrar2PDA,
        protocolState,
      })
      .signers([registrar2])
      .rpc();

    titleDeed2PDA = getTitleDeedPDA(owner2.publicKey);
    title2NumberLookupPDA = getTitleNumberLookupPDA(owner2Details.titleNumber);

    // assign title deed to owner2
    const owner2OwnershipHistoryPDA = getOwnershipHistoryPDA(titleDeed2PDA, 0);
    await program.methods
      .assignTitleDeedToOwner(
        owner2.publicKey,
        owner2Details.titleNumber,
        owner2Details.location,
        owner2Details.acreage,
        owner2Details.districtLandRegistry,
        owner2Details.registryMapsheetNumber
      )
      .accounts({
        authority: registrar2.publicKey,
        registrar: registrar2PDA,
        titleDeed: titleDeed2PDA,
        owner: owner2PDA,
        ownershipHistory: owner2OwnershipHistoryPDA,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([registrar2])
      .rpc();
  });

  describe("admin accounts", () => {
    it("Protocol is initialized!", async () => {
      // fetch the protocol
      const protocol = await program.account.protocolState.fetch(protocolState);
      assert.equal(protocol.admins.length, 2);
      assert.equal(protocol.admins[0].toString(), admin1.publicKey.toString());
      assert.equal(protocol.admins[1].toString(), admin2.publicKey.toString());
      assert.equal(protocol.isPaused, false);
    });

    it("confirms admin account successfully", async () => {
      await program.methods
        .confirmAdminAccount()
        .accounts({
          authority: admin2.publicKey,
          admin: admin2PDA,
          protocolState,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([admin2])
        .rpc();

      // fetch the admin
      const admin = await program.account.admin.fetch(admin2PDA);
      assert.equal(admin.authority.toString(), admin2.publicKey.toString());
    });

    it("cannot confirm admin account if not an admin", async () => {
      try {
        await program.methods
          .confirmAdminAccount()
          .accounts({
            authority: fakeAdmin.publicKey,
            admin: fakeAdminPDA,
            protocolState,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([fakeAdmin])
          .rpc();
        assert.fail("Expected transaction to fail");
      } catch (error) {
        // Verify it's an Anchor error with InvalidAdmin error code
        assert.ok(error instanceof anchor.AnchorError, "Expected AnchorError");
        const anchorError = error as anchor.AnchorError;
        assert.equal(
          anchorError.error?.errorCode?.code,
          "InvalidAdmin",
          `Expected InvalidAdmin error, got: ${anchorError.error?.errorCode?.code}`
        );
      }
    });

    it("cannot allow an admin to confirm another admin's account", async () => {
      try {
        await program.methods
          .confirmAdminAccount()
          .accounts({
            authority: admin1.publicKey,
            admin: admin2PDA,
            protocolState,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([admin1])
          .rpc();
        assert.fail("Expected transaction to fail");
      } catch (error: any) {
        // Verify it's an Anchor error with ConstraintSeeds error
        assert.ok(error instanceof anchor.AnchorError, "Expected AnchorError");
        const anchorError = error as anchor.AnchorError;

        // Get error message and logs
        const errorMessage = anchorError.message || "";

        // Check for "A seeds constraint was violated." error message
        const hasSeedsConstraintError =
          errorMessage.includes("A seeds constraint was violated.") ||
          anchorError.error?.errorCode?.code === "ConstraintSeeds";

        assert.ok(
          hasSeedsConstraintError,
          `Expected "A seeds constraint was violated." error. Message: ${errorMessage}, Code: ${anchorError.error?.errorCode?.code}`
        );
      }
    });
  });

  describe("registrar accounts", async () => {
    before(async () => {
      await program.methods
        .addRegistrar(
          registrar1.publicKey,
          registrar1Details.firstName,
          registrar1Details.lastName,
          registrar1Details.idNumber
        )
        .accounts({
          authority: admin1.publicKey,
          registrar: registrar1PDA,
          admin: admin1PDA,
          protocolState,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([admin1])
        .rpc();
    });

    it("allows an admin to add a registrar account", async () => {
      // fetch the registrar
      const registrar = await program.account.registrar.fetch(registrar1PDA);
      assert.equal(
        registrar.authority.toString(),
        registrar1.publicKey.toString()
      );
      assert.equal(registrar.firstName, registrar1Details.firstName);
      assert.equal(registrar.lastName, registrar1Details.lastName);
      assert.equal(registrar.idNumber, registrar1Details.idNumber);
      assert.equal(registrar.isActive, false); // Should not be active until confirmed
    });

    it("cannot add a registrar account if not an admin", async () => {
      // Create a new registrar PDA for this test (different from the one in before hook)
      const registrar2 = anchor.web3.Keypair.generate();
      const [registrar2PDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("registrar"), registrar2.publicKey.toBuffer()],
        program.programId
      );

      try {
        await program.methods
          .addRegistrar(registrar2.publicKey, "Jane", "Smith", "0987654321")
          .accounts({
            authority: fakeAdmin.publicKey,
            registrar: registrar2PDA,
            admin: admin1PDA, // Use existing admin account
            protocolState,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([fakeAdmin])
          .rpc();
        assert.fail("Expected transaction to fail");
      } catch (error) {
        assert.ok(error instanceof anchor.AnchorError, "Expected AnchorError");
        const anchorError = error as anchor.AnchorError;
        assert.equal(
          anchorError.error?.errorCode?.code,
          "InvalidAdmin",
          `Expected InvalidAdmin error, got: ${anchorError.error?.errorCode?.code}`
        );
      }
    });

    it("registrar confirms a registrar account successfully", async () => {
      await program.methods
        .confirmRegistrarAccount()
        .accounts({
          authority: registrar1.publicKey,
          registrar: registrar1PDA,
          protocolState,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([registrar1])
        .rpc();

      // fetch the registrar
      const registrar = await program.account.registrar.fetch(registrar1PDA);
      assert.equal(registrar.isActive, true);
    });

    it("cannot confirm a registrar account of another registrar", async () => {
      // Create registrar2 account
      const registrar2 = anchor.web3.Keypair.generate();
      const [registrar2PDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("registrar"), registrar2.publicKey.toBuffer()],
        program.programId
      );

      await airdrop(registrar2.publicKey, 1_000_000_000);

      await program.methods
        .addRegistrar(registrar2.publicKey, "Jane", "Smith", "0987654321")
        .accounts({
          authority: admin1.publicKey,
          registrar: registrar2PDA,
          admin: admin1PDA,
          protocolState,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([admin1])
        .rpc();

      try {
        await program.methods
          .confirmRegistrarAccount()
          .accounts({
            authority: registrar1.publicKey, // registrar1 is signing
            registrar: registrar2PDA, // But trying to use registrar2's PDA
            protocolState,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([registrar1])
          .rpc();
        assert.fail("Expected transaction to fail");
      } catch (error: any) {
        // Should fail with seeds constraint error because PDA doesn't match
        assert.ok(error instanceof anchor.AnchorError, "Expected AnchorError");
        const anchorError = error as anchor.AnchorError;
        const errorMessage = anchorError.message || "";
        const hasSeedsConstraintError =
          errorMessage.includes("A seeds constraint was violated.") ||
          anchorError.error?.errorCode?.code === "ConstraintSeeds";

        assert.ok(
          hasSeedsConstraintError,
          `Expected seeds constraint error, got: ${errorMessage}, Code: ${anchorError.error?.errorCode?.code}`
        );
      }
    });

    it("cannot confirm a registrar account if already confirmed", async () => {
      try {
        await program.methods
          .confirmRegistrarAccount()
          .accounts({
            authority: registrar1.publicKey,
            registrar: registrar1PDA,
            protocolState,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([registrar1])
          .rpc();
        assert.fail("Expected transaction to fail");
      } catch (error) {
        assert.ok(error instanceof anchor.AnchorError, "Expected AnchorError");
        const anchorError = error as anchor.AnchorError;
        assert.equal(
          anchorError.error?.errorCode?.code,
          "RegistrarAlreadyConfirmed",
          "Expected RegistrarAlreadyConfirmed error"
        );
      }
    });
  });

  describe("user accounts", () => {
    it("allows a user to create a user account", async () => {
      const user = await program.account.user.fetch(owner1PDA);
      assert.equal(user.authority.toString(), owner1.publicKey.toString());
      assert.equal(user.firstName, owner1Details.firstName);
      assert.equal(user.lastName, owner1Details.lastName);
      assert.equal(user.idNumber, owner1Details.idNumber);
      assert.equal(user.phoneNumber, owner1Details.phoneNumber);
    });

    it("rejects duplicate id_number", async () => {
      const user2 = anchor.web3.Keypair.generate();
      await airdrop(user2.publicKey, 1_000_000_000);

      const user2PDA = getUserAddress(owner1Details.idNumber, user2.publicKey); // Same id_number as user1
      const idNumberClaimPDA2 = getIdNumberClaimPDA(owner1Details.idNumber);

      try {
        await program.methods
          .createUserAccount(
            "Jane",
            "Smith",
            owner1Details.idNumber, // Duplicate id_number
            "0987654321"
          )
          .accounts({
            authority: user2.publicKey,
            user: user2PDA,
            idNumberClaim: idNumberClaimPDA2,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([user2])
          .rpc();

        throw new Error("Should have rejected duplicate id_number");
      } catch (error: any) {
        // Should fail because idNumberClaim account already exists
        assert.ok(
          error.message.includes("already in use") ||
            error.message.includes("ConstraintSeeds") ||
            error.code === 3009, // AccountAlreadyInUse
          "Expected account already in use error"
        );
      }
    });
  });

  describe("title deeds", () => {
    // actors
    const buyer1 = anchor.web3.Keypair.generate();

    // PDAs
    let titleDeedPDA: PublicKey;
    let titleNumberLookupPDA: PublicKey;
    let agreement2PDA: PublicKey;
    let title2ForSalePDA: PublicKey;
    let buyer1PDA: PublicKey;
    let buyer1IdNumberClaimPDA: PublicKey;
    let agreementIndex2PDA: PublicKey;
    let agreement2EscrowPDA: PublicKey;
    before(async () => {
      // airdrops
      await airdrop(buyer1.publicKey, 1000000000);

      // buyer1 details
      const buyer1Details = {
        idNumber: "896516816161",
        firstName: "Buyer",
        lastName: "One",
        phoneNumber: "121546868",
      };
      buyer1PDA = getUserAddress(buyer1Details.idNumber, buyer1.publicKey);
      buyer1IdNumberClaimPDA = getIdNumberClaimPDA(buyer1Details.idNumber);
      titleDeedPDA = getTitleDeedPDA(owner1.publicKey);
      titleNumberLookupPDA = getTitleNumberLookupPDA(owner1Details.titleNumber);
      title2ForSalePDA = getTitleForSalePDA(titleDeed2PDA, owner2.publicKey);

      // create a buyer account
      await createUserAccount(
        buyer1,
        buyer1Details.firstName,
        buyer1Details.lastName,
        buyer1Details.idNumber,
        buyer1Details.phoneNumber,
        buyer1PDA,
        buyer1IdNumberClaimPDA
      );

      await assignTitleDeedToOwner(
        registrar2,
        registrar2PDA,
        owner1.publicKey,
        owner1Details.titleNumber,
        owner1Details.location,
        owner1Details.acreage,
        owner1Details.districtLandRegistry,
        owner1Details.registryMapsheetNumber,
        titleDeedPDA,
        owner1PDA
      );

      // owner2 marks title deed for sale
      await markTitleForSale(
        owner2,
        new BN(1000000000),
        titleDeed2PDA,
        owner2PDA,
        title2ForSalePDA
      );

      // owner1 is interested in buying land from owner2(with title2 of number 342343243)
      await searchTitleDeedByNumber(
        owner1,
        owner2Details.titleNumber,
        title2NumberLookupPDA,
        titleDeed2PDA,
        owner1PDA
      );

      // fetch search result
      const searchResult = await program.account.titleNumberLookup.fetch(
        title2NumberLookupPDA
      );

      // owner2 makes agreement
      agreement2PDA = getAgreementPDA(
        owner2.publicKey,
        owner1.publicKey,
        titleDeed2PDA,
        new BN(1000000000)
      );
      agreementIndex2PDA = getAgreementIndexPDA(titleDeed2PDA);
      agreement2EscrowPDA = getEscrowPDA(agreement2PDA);

      await makeAgreement(
        owner2,
        new BN(1000000000),
        titleDeed2PDA,
        title2ForSalePDA,
        owner2PDA,
        owner1PDA,
        title2NumberLookupPDA,
        agreement2PDA,
        agreementIndex2PDA
      );

      // Buyer (owner1) signs the agreement
      await signAgreement(
        owner1,
        new BN(1000000000),
        titleDeed2PDA,
        agreement2PDA
      );
    });

    it("allows a registrar to assign a title deed to a owner", async () => {
      const titleDeed = await program.account.titleDeed.fetch(titleDeedPDA);
      assert.equal(titleDeed.authority.toString(), owner1.publicKey.toString());
      assert.equal(
        titleDeed.owner.authority.toString(),
        owner1.publicKey.toString()
      );
      assert.equal(titleDeed.isForSale, false);
      assert.equal(
        titleDeed.totalTransfers.toNumber(),
        0,
        "Initial assignment should have 0 transfers"
      );
    });

    it("records ownership history for initial title deed assignment", async () => {
      const ownershipHistoryPDA = getOwnershipHistoryPDA(titleDeedPDA, 0);
      const ownershipHistory = await program.account.ownershipHistory.fetch(
        ownershipHistoryPDA
      );

      assert.equal(
        ownershipHistory.titleDeed.toString(),
        titleDeedPDA.toString(),
        "Ownership history should reference correct title deed"
      );
      assert.equal(
        ownershipHistory.previousOwner.toString(),
        PublicKey.default.toString(),
        "Previous owner should be default (no previous owner for initial assignment)"
      );
      assert.equal(
        ownershipHistory.currentOwner.toString(),
        owner1.publicKey.toString(),
        "Current owner should be owner1"
      );
      assert.equal(
        ownershipHistory.sequenceNumber.toNumber(),
        0,
        "Sequence number should be 0 for initial assignment"
      );
      assert.ok(
        "initialAssignment" in ownershipHistory.transferType,
        "Transfer type should be InitialAssignment"
      );
    });

    it("can allow owner to mark title deed for sale", async () => {
      const title1ForSalePDA = getTitleForSalePDA(
        titleDeedPDA,
        owner1.publicKey
      );
      await program.methods
        .markTitleForSale(new BN(1000000000))
        .accounts({
          authority: owner1.publicKey, // owner
          titleDeed: titleDeedPDA,
          seller: owner1PDA,
          titleForSale: title1ForSalePDA,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([owner1])
        .rpc();
      const title1ForSale = await program.account.titleForSale.fetch(
        title1ForSalePDA
      );
      assert.equal(title1ForSale.titleDeed.toString(), titleDeedPDA.toString());
    });

    it("cannot allow owner to mark title deed for sale if not the owner", async () => {
      const titleForSalePDA = getTitleForSalePDA(
        titleDeedPDA,
        owner2.publicKey
      );
      const owner2PDA = getUserAddress(
        owner2Details.idNumber,
        owner2.publicKey
      );

      try {
        await program.methods
          .markTitleForSale(new BN(1000000000))
          .accounts({
            authority: owner2.publicKey, // not the owner
            titleDeed: titleDeedPDA,
            seller: owner2PDA,
            titleForSale: titleForSalePDA,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([owner2])
          .rpc();
        assert.fail("Expected transaction to fail");
      } catch (error) {
        assert.ok(error instanceof anchor.AnchorError, "Expected AnchorError");
        const anchorError = error as anchor.AnchorError;
        assert.equal(
          anchorError.error?.errorCode?.code,
          "Unauthorized",
          "Expected Unauthorized error"
        );
      }
    });

    it("can allow a buyer to search for a title deed by title number", async () => {
      // fetch the title deed details
      const titleDeed = await program.account.titleDeed.fetch(titleDeed2PDA);
      // confirm if owner2 is the rightful owner of the title deed
      assert.equal(titleDeed.authority.toString(), owner2.publicKey.toString());
      assert.equal(
        titleDeed.owner.authority.toString(),
        owner2.publicKey.toString()
      );
      // title2 was marked for sale in the before hook, so isForSale should be true
      assert.equal(titleDeed.isForSale, true);
    });

    it("can allow a buyer to make an agreement", async () => {
      const agreement = await program.account.agreement.fetch(agreement2PDA);
      assert.equal(
        agreement.seller.authority.toString(),
        owner2.publicKey.toString()
      );
      assert.equal(
        agreement.buyer.authority.toString(),
        owner1.publicKey.toString()
      );
      assert.equal(agreement.titleDeed.toString(), titleDeed2PDA.toString());
      assert.equal(agreement.price.toString(), new BN(1000000000).toString());
      assert.equal(agreement.draftedBy.toString(), owner2.publicKey.toString());
    });

    it("does not allow seller to have multiple agreements for the same title deed at the same time", async () => {
      // owner2 already has an agreement for the same title deed
      // buyer1 is interested in buying the title deed from owner2 and performs a search
      await program.methods
        .searchTitleDeedByNumber(owner2Details.titleNumber)
        .accounts({
          authority: buyer1.publicKey,
          titleDeed: titleDeed2PDA,
          titleNumberLookup: title2NumberLookupPDA,
          searchedBy: buyer1PDA,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([buyer1])
        .rpc();

      // create a new agreement for the same title deed
      const agreement3PDA = getAgreementPDA(
        owner2.publicKey,
        buyer1.publicKey,
        titleDeed2PDA,
        new BN(1000000000)
      );
      const agreementIndex3PDA = getAgreementIndexPDA(titleDeed2PDA);
      try {
        await program.methods
          .makeAgreement(new BN(1000000000))
          .accounts({
            authority: owner2.publicKey,
            titleDeed: titleDeed2PDA,
            titleForSale: title2ForSalePDA,
            seller: owner2PDA,
            buyer: buyer1PDA,
            titleNumberLookup: title2NumberLookupPDA,
            agreement: agreement3PDA,
            agreementIndex: agreementIndex3PDA,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([owner2])
          .rpc();
        assert.fail("Expected transaction to fail");
      } catch (error) {
        assert.ok(error instanceof anchor.AnchorError, "Expected AnchorError");
        const anchorError = error as anchor.AnchorError;
        assert.equal(
          anchorError.error?.errorCode?.code,
          "AgreementAlreadyExists",
          "Expected AgreementAlreadyExists error"
        );
      }
    });

    it("does not allow seller to cancel an agreement if not the seller", async () => {
      // the agreement is between owner2(seller) and buyer1(buyer)
      // buyer1 who is not part of the deal tries to cancel the agreement
      try {
        await program.methods
          .cancelAgreement()
          .accounts({
            authority: buyer1.publicKey,
            agreement: agreement2PDA,
            agreementIndex: agreementIndex2PDA,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([buyer1])
          .rpc();
        assert.fail("Expected transaction to fail");
      } catch (error) {
        assert.ok(error instanceof anchor.AnchorError, "Expected AnchorError");
        const anchorError = error as anchor.AnchorError;
        assert.equal(
          anchorError.error?.errorCode?.code,
          "Unauthorized",
          "Expected Unauthorized error"
        );
      }
    });

    it("can allow a buyer to cancel an agreement", async () => {
      // fetch the agreement before cancellation
      const agreementBeforeCancellation = await program.account.agreement.fetch(
        agreement2PDA
      );
      assert.equal(
        agreementBeforeCancellation.seller.authority.toString(),
        owner2.publicKey.toString()
      );
      assert.equal(
        agreementBeforeCancellation.buyer.authority.toString(),
        owner1.publicKey.toString()
      );
      await program.methods
        .cancelAgreement()
        .accounts({
          authority: owner1.publicKey,
          agreement: agreement2PDA,
          agreementIndex: agreementIndex2PDA,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([owner1])
        .rpc();

      // Assert that the agreement account no longer exists after cancellation
      try {
        await program.account.agreement.fetch(agreement2PDA);
        assert.fail("Expected account to not exist after cancellation");
      } catch (error: any) {
        assert.ok(
          error.message.includes("Account does not exist") ||
            error.message.includes("has no data"),
          "Expected account not found error"
        );
      }

      // owner2's land should still be marked for sale
      const titleDeed = await program.account.titleForSale.fetch(
        title2ForSalePDA
      );
      assert.equal(
        titleDeed.salePrice.toString(),
        new BN(1000000000).toString()
      );
    });
  });

  describe("escrows", () => {
    // PDAs for escrow tests
    let titleDeedPDA: PublicKey;
    let titleForSalePDA: PublicKey;
    let titleNumberLookupPDA: PublicKey;
    let agreementPDA: PublicKey;
    let agreementIndexPDA: PublicKey;
    let escrowPDA: PublicKey;
    let buyerPDA: PublicKey;
    let buyerIdNumberClaimPDA: PublicKey;
    let sellerPDA: PublicKey;
    let sellerIdNumberClaimPDA: PublicKey;

    // Escrow buyer and seller
    const escrowBuyer = anchor.web3.Keypair.generate();
    const escrowSeller = anchor.web3.Keypair.generate();

    // Escrow seller and title details
    const sellerDetails = {
      idNumber: "777666555444",
      firstName: "Escrow",
      lastName: "Seller",
      phoneNumber: "777666555",
    };
    const escrowTitleDetails = {
      titleNumber: "555666777888",
      location: "Mombasa",
      acreage: 200,
      districtLandRegistry: "Mombasa",
      registryMapsheetNumber: new BN(123456789),
    };

    before(async () => {
      // airdrops
      await airdrop(escrowBuyer.publicKey, 1000000000);
      await airdrop(escrowSeller.publicKey, 1000000000);

      // escrow buyer details
      const escrowBuyerDetails = {
        idNumber: "999888777666",
        firstName: "Escrow",
        lastName: "Buyer",
        phoneNumber: "999888777",
      };
      buyerPDA = getUserAddress(
        escrowBuyerDetails.idNumber,
        escrowBuyer.publicKey
      );
      buyerIdNumberClaimPDA = getIdNumberClaimPDA(escrowBuyerDetails.idNumber);

      // escrow seller PDAs
      sellerPDA = getUserAddress(
        sellerDetails.idNumber,
        escrowSeller.publicKey
      );
      sellerIdNumberClaimPDA = getIdNumberClaimPDA(sellerDetails.idNumber);

      // Create escrow buyer account
      await createUserAccount(
        escrowBuyer,
        escrowBuyerDetails.firstName,
        escrowBuyerDetails.lastName,
        escrowBuyerDetails.idNumber,
        escrowBuyerDetails.phoneNumber,
        buyerPDA,
        buyerIdNumberClaimPDA
      );

      // Create escrow seller account
      await createUserAccount(
        escrowSeller,
        sellerDetails.firstName,
        sellerDetails.lastName,
        sellerDetails.idNumber,
        sellerDetails.phoneNumber,
        sellerPDA,
        sellerIdNumberClaimPDA
      );

      // Set up PDAs for escrow title deed
      titleDeedPDA = getTitleDeedPDA(escrowSeller.publicKey);
      titleForSalePDA = getTitleForSalePDA(
        titleDeedPDA,
        escrowSeller.publicKey
      );
      titleNumberLookupPDA = getTitleNumberLookupPDA(
        escrowTitleDetails.titleNumber
      );

      // Assign title deed to escrow seller
      await assignTitleDeedToOwner(
        registrar2,
        registrar2PDA,
        escrowSeller.publicKey,
        escrowTitleDetails.titleNumber,
        escrowTitleDetails.location,
        escrowTitleDetails.acreage,
        escrowTitleDetails.districtLandRegistry,
        escrowTitleDetails.registryMapsheetNumber,
        titleDeedPDA,
        sellerPDA
      );

      // Mark title deed for sale
      await markTitleForSale(
        escrowSeller,
        new BN(1000000000),
        titleDeedPDA,
        sellerPDA,
        titleForSalePDA
      );

      // Buyer searches for title deed
      await searchTitleDeedByNumber(
        escrowBuyer,
        escrowTitleDetails.titleNumber,
        titleNumberLookupPDA,
        titleDeedPDA,
        buyerPDA
      );

      // Create agreement
      agreementPDA = getAgreementPDA(
        escrowSeller.publicKey,
        escrowBuyer.publicKey,
        titleDeedPDA,
        new BN(1000000000)
      );
      agreementIndexPDA = getAgreementIndexPDA(titleDeedPDA);
      escrowPDA = getEscrowPDA(agreementPDA);

      await makeAgreement(
        escrowSeller,
        new BN(1000000000),
        titleDeedPDA,
        titleForSalePDA,
        sellerPDA,
        buyerPDA,
        titleNumberLookupPDA,
        agreementPDA,
        agreementIndexPDA
      );

      // Buyer signs the agreement
      await signAgreement(
        escrowBuyer,
        new BN(1000000000),
        titleDeedPDA,
        agreementPDA
      );
    });

    it("does not allow non-owner to create an escrow", async () => {
      try {
        await createEscrow(
          escrowBuyer,
          titleDeedPDA,
          agreementPDA,
          sellerPDA,
          buyerPDA,
          escrowPDA
        );
        assert.fail("Expected transaction to fail");
      } catch (error) {
        assert.ok(error instanceof anchor.AnchorError, "Expected AnchorError");
        const anchorError = error as anchor.AnchorError;
        assert.equal(
          anchorError.error?.errorCode?.code,
          "Unauthorized",
          "Expected Unauthorized error"
        );
      }
    });

    it("does not allow seller to create escrow with a buyer not in the agreement", async () => {
      try {
        await createEscrow(
          escrowSeller,
          titleDeedPDA,
          agreementPDA,
          sellerPDA,
          owner1PDA,
          escrowPDA
        );
        assert.fail("Expected transaction to fail");
      } catch (error) {
        assert.ok(error instanceof anchor.AnchorError, "Expected AnchorError");
        const anchorError = error as anchor.AnchorError;
        assert.equal(
          anchorError.error?.errorCode?.code,
          "Unauthorized",
          "Expected Unauthorized error"
        );
      }
    });

    it("does not allow escrow creation if agreement has been cancelled", async () => {
      // Create a new seller for this test to avoid title deed PDA conflicts
      const testSeller = anchor.web3.Keypair.generate();
      const testSellerDetails = {
        idNumber: "333444555666",
        firstName: "Test",
        lastName: "Seller",
        phoneNumber: "333444555",
      };
      const testSellerPDA = getUserAddress(
        testSellerDetails.idNumber,
        testSeller.publicKey
      );
      const testSellerIdNumberClaimPDA = getIdNumberClaimPDA(
        testSellerDetails.idNumber
      );

      await airdrop(testSeller.publicKey, 1000000000);
      await createUserAccount(
        testSeller,
        testSellerDetails.firstName,
        testSellerDetails.lastName,
        testSellerDetails.idNumber,
        testSellerDetails.phoneNumber,
        testSellerPDA,
        testSellerIdNumberClaimPDA
      );

      // Create a new title deed and agreement for this test
      const testTitleNumber = "888777666555";
      const testTitleNumberLookupPDA = getTitleNumberLookupPDA(testTitleNumber);
      const testTitleDeedPDA = getTitleDeedPDA(testSeller.publicKey);
      const testTitleForSalePDA = getTitleForSalePDA(
        testTitleDeedPDA,
        testSeller.publicKey
      );

      // Assign a new title deed to testSeller
      await assignTitleDeedToOwner(
        registrar2,
        registrar2PDA,
        testSeller.publicKey,
        testTitleNumber,
        "Test Location 2",
        250,
        "Test Registry 2",
        new BN(111222333),
        testTitleDeedPDA,
        testSellerPDA
      );

      // Mark for sale
      await markTitleForSale(
        testSeller,
        new BN(3000000000),
        testTitleDeedPDA,
        testSellerPDA,
        testTitleForSalePDA
      );

      // Buyer searches (using escrowBuyer from before hook)
      await searchTitleDeedByNumber(
        escrowBuyer,
        testTitleNumber,
        testTitleNumberLookupPDA,
        testTitleDeedPDA,
        buyerPDA
      );

      // Create agreement
      const testAgreementPDA = getAgreementPDA(
        testSeller.publicKey,
        escrowBuyer.publicKey,
        testTitleDeedPDA,
        new BN(3000000000)
      );
      const testAgreementIndexPDA = getAgreementIndexPDA(testTitleDeedPDA);
      const testEscrowPDA = getEscrowPDA(testAgreementPDA);

      await makeAgreement(
        testSeller,
        new BN(3000000000),
        testTitleDeedPDA,
        testTitleForSalePDA,
        testSellerPDA,
        buyerPDA,
        testTitleNumberLookupPDA,
        testAgreementPDA,
        testAgreementIndexPDA
      );

      // Buyer signs agreement (using escrowBuyer from before hook)
      await signAgreement(
        escrowBuyer,
        new BN(3000000000),
        testTitleDeedPDA,
        testAgreementPDA
      );

      // Cancel the agreement (buyer cancels it)
      await program.methods
        .cancelAgreement()
        .accounts({
          authority: escrowBuyer.publicKey,
          agreement: testAgreementPDA,
          agreementIndex: testAgreementIndexPDA,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([escrowBuyer])
        .rpc();

      // Verify agreement is cancelled (account should be closed)
      try {
        await program.account.agreement.fetch(testAgreementPDA);
        assert.fail(
          "Expected agreement account to not exist after cancellation"
        );
      } catch (error: any) {
        assert.ok(
          error.message.includes("Account does not exist") ||
            error.message.includes("has no data"),
          "Expected account not found error"
        );
      }

      // Attempt to create escrow with cancelled agreement (should fail)
      // Note: When an agreement is cancelled, the account is closed (deleted),
      // so Anchor will fail with AccountNotInitialized when trying to deserialize it
      try {
        await createEscrow(
          testSeller,
          testTitleDeedPDA,
          testAgreementPDA,
          testSellerPDA,
          buyerPDA,
          testEscrowPDA
        );
        assert.fail("Expected transaction to fail");
      } catch (error) {
        assert.ok(error instanceof anchor.AnchorError, "Expected AnchorError");
        const anchorError = error as anchor.AnchorError;
        // When account is closed, Anchor fails with AccountNotInitialized before handler runs
        assert.ok(
          anchorError.error?.errorCode?.code === "AccountNotInitialized" ||
            anchorError.error?.errorCode?.code === "AgreementAlreadyCancelled",
          `Expected AccountNotInitialized or AgreementAlreadyCancelled error, got ${anchorError.error?.errorCode?.code}`
        );
      }
    });

    it("can allow a seller to create an escrow", async () => {
      // escrow seller creates escrow for the agreement
      await createEscrow(
        escrowSeller,
        titleDeedPDA,
        agreementPDA,
        sellerPDA,
        buyerPDA,
        escrowPDA
      );

      // fetch created escrow
      const escrow = await program.account.escrow.fetch(escrowPDA);
      assert.equal(escrow.agreement.toString(), agreementPDA.toString());
      assert.equal(escrow.titleDeed.toString(), titleDeedPDA.toString());
      assert.equal(escrow.seller.toString(), escrowSeller.publicKey.toString());
      assert.equal(escrow.buyer.toString(), escrowBuyer.publicKey.toString());

      // Verify that title deed authority was transferred to escrow
      const titleDeed = await program.account.titleDeed.fetch(titleDeedPDA);
      assert.equal(titleDeed.authority.toString(), escrowPDA.toString());
    });

    describe("deposits", () => {
      // PDAs for deposit tests
      let depositTitleDeedPDA: PublicKey;
      let depositTitleForSalePDA: PublicKey;
      let depositTitleNumberLookupPDA: PublicKey;
      let depositAgreementPDA: PublicKey;
      let depositAgreementIndexPDA: PublicKey;
      let depositEscrowPDA: PublicKey;
      let depositBuyerPDA: PublicKey;
      let depositBuyerIdNumberClaimPDA: PublicKey;
      let depositSellerPDA: PublicKey;
      let depositSellerIdNumberClaimPDA: PublicKey;
      let depositPDA: PublicKey;

      // Deposit buyer and seller
      const depositBuyer = anchor.web3.Keypair.generate();
      const depositSeller = anchor.web3.Keypair.generate();

      // Deposit seller and title details
      const depositSellerDetails = {
        idNumber: "111222333444",
        firstName: "Deposit",
        lastName: "Seller",
        phoneNumber: "111222333",
      };
      const depositTitleDetails = {
        titleNumber: "777888999000",
        location: "Nakuru",
        acreage: 150,
        districtLandRegistry: "Nakuru",
        registryMapsheetNumber: new BN(987654321),
      };

      before(async () => {
        // airdrops
        // Buyer needs enough for: deposit (2 SOL) + rent for deposit account + transaction fees
        await airdrop(depositBuyer.publicKey, 3000000000); // 3 SOL
        await airdrop(depositSeller.publicKey, 1000000000);

        // deposit buyer details
        const depositBuyerDetails = {
          idNumber: "222333444555",
          firstName: "Deposit",
          lastName: "Buyer",
          phoneNumber: "222333444",
        };
        depositBuyerPDA = getUserAddress(
          depositBuyerDetails.idNumber,
          depositBuyer.publicKey
        );
        depositBuyerIdNumberClaimPDA = getIdNumberClaimPDA(
          depositBuyerDetails.idNumber
        );

        // deposit seller PDAs
        depositSellerPDA = getUserAddress(
          depositSellerDetails.idNumber,
          depositSeller.publicKey
        );
        depositSellerIdNumberClaimPDA = getIdNumberClaimPDA(
          depositSellerDetails.idNumber
        );

        // Create deposit buyer account
        await createUserAccount(
          depositBuyer,
          depositBuyerDetails.firstName,
          depositBuyerDetails.lastName,
          depositBuyerDetails.idNumber,
          depositBuyerDetails.phoneNumber,
          depositBuyerPDA,
          depositBuyerIdNumberClaimPDA
        );

        // Create deposit seller account
        await createUserAccount(
          depositSeller,
          depositSellerDetails.firstName,
          depositSellerDetails.lastName,
          depositSellerDetails.idNumber,
          depositSellerDetails.phoneNumber,
          depositSellerPDA,
          depositSellerIdNumberClaimPDA
        );

        // Set up PDAs for deposit title deed
        depositTitleDeedPDA = getTitleDeedPDA(depositSeller.publicKey);
        depositTitleForSalePDA = getTitleForSalePDA(
          depositTitleDeedPDA,
          depositSeller.publicKey
        );
        depositTitleNumberLookupPDA = getTitleNumberLookupPDA(
          depositTitleDetails.titleNumber
        );

        // Assign title deed to deposit seller
        await assignTitleDeedToOwner(
          registrar2,
          registrar2PDA,
          depositSeller.publicKey,
          depositTitleDetails.titleNumber,
          depositTitleDetails.location,
          depositTitleDetails.acreage,
          depositTitleDetails.districtLandRegistry,
          depositTitleDetails.registryMapsheetNumber,
          depositTitleDeedPDA,
          depositSellerPDA
        );

        // Mark title deed for sale
        await markTitleForSale(
          depositSeller,
          new BN(2000000000), // 2 SOL
          depositTitleDeedPDA,
          depositSellerPDA,
          depositTitleForSalePDA
        );

        // Buyer searches for title deed
        await searchTitleDeedByNumber(
          depositBuyer,
          depositTitleDetails.titleNumber,
          depositTitleNumberLookupPDA,
          depositTitleDeedPDA,
          depositBuyerPDA
        );

        // Create agreement
        depositAgreementPDA = getAgreementPDA(
          depositSeller.publicKey,
          depositBuyer.publicKey,
          depositTitleDeedPDA,
          new BN(2000000000) // 2 SOL
        );
        depositAgreementIndexPDA = getAgreementIndexPDA(depositTitleDeedPDA);
        depositEscrowPDA = getEscrowPDA(depositAgreementPDA);

        await makeAgreement(
          depositSeller,
          new BN(2000000000),
          depositTitleDeedPDA,
          depositTitleForSalePDA,
          depositSellerPDA,
          depositBuyerPDA,
          depositTitleNumberLookupPDA,
          depositAgreementPDA,
          depositAgreementIndexPDA
        );

        // Buyer signs the agreement
        await signAgreement(
          depositBuyer,
          new BN(2000000000),
          depositTitleDeedPDA,
          depositAgreementPDA
        );

        // Seller creates escrow
        await createEscrow(
          depositSeller,
          depositTitleDeedPDA,
          depositAgreementPDA,
          depositSellerPDA,
          depositBuyerPDA,
          depositEscrowPDA
        );

        // Set deposit PDA after escrow is created
        depositPDA = getDepositPDA(depositEscrowPDA);
      });

      it("only allows buyer to deposit the agreed price amount", async () => {
        // Agreement price is 2000000000 lamports (2 SOL)
        // Attempt to deposit more than the agreed price (should fail)
        try {
          await program.methods
            .depositPaymentToEscrow(new BN(3000000000)) // 3 SOL - greater than agreed 2 SOL
            .accounts({
              authority: depositBuyer.publicKey,
              buyer: depositBuyerPDA,
              seller: depositSellerPDA,
              escrow: depositEscrowPDA,
              agreement: depositAgreementPDA,
              deposit: depositPDA,
              systemProgram: anchor.web3.SystemProgram.programId,
            })
            .signers([depositBuyer])
            .rpc();
          assert.fail(
            "Expected transaction to fail due to payment amount mismatch"
          );
        } catch (error) {
          assert.ok(
            error instanceof anchor.AnchorError,
            "Expected AnchorError"
          );
          const anchorError = error as anchor.AnchorError;
          assert.equal(
            anchorError.error?.errorCode?.code,
            "PaymentAmountMismatch",
            "Expected PaymentAmountMismatch error"
          );
        }
      });

      it("does not allow non-buyer to deposit payment", async () => {
        // Create a new user who is not the buyer
        const unauthorizedUser = anchor.web3.Keypair.generate();
        await airdrop(unauthorizedUser.publicKey, 1000000000);

        const unauthorizedUserDetails = {
          idNumber: "444555666777",
          firstName: "Unauthorized",
          lastName: "User",
          phoneNumber: "444555666",
        };
        const unauthorizedUserPDA = getUserAddress(
          unauthorizedUserDetails.idNumber,
          unauthorizedUser.publicKey
        );
        const unauthorizedUserIdNumberClaimPDA = getIdNumberClaimPDA(
          unauthorizedUserDetails.idNumber
        );

        // Create unauthorized user account
        await createUserAccount(
          unauthorizedUser,
          unauthorizedUserDetails.firstName,
          unauthorizedUserDetails.lastName,
          unauthorizedUserDetails.idNumber,
          unauthorizedUserDetails.phoneNumber,
          unauthorizedUserPDA,
          unauthorizedUserIdNumberClaimPDA
        );

        // Attempt to deposit payment using unauthorized user (should fail)
        try {
          await program.methods
            .depositPaymentToEscrow(new BN(2000000000))
            .accounts({
              authority: unauthorizedUser.publicKey,
              buyer: unauthorizedUserPDA, // Using unauthorized user's PDA
              seller: depositSellerPDA,
              escrow: depositEscrowPDA,
              agreement: depositAgreementPDA,
              deposit: depositPDA,
              systemProgram: anchor.web3.SystemProgram.programId,
            })
            .signers([unauthorizedUser])
            .rpc();
          assert.fail("Expected transaction to fail due to unauthorized user");
        } catch (error) {
          assert.ok(
            error instanceof anchor.AnchorError,
            "Expected AnchorError"
          );
          const anchorError = error as anchor.AnchorError;
          assert.equal(
            anchorError.error?.errorCode?.code,
            "Unauthorized",
            "Expected Unauthorized error"
          );
        }
      });

      it("allows buyer to deposit payment successfully", async () => {
        // Get balances before deposit
        const buyerBalanceBefore = await program.provider.connection.getBalance(
          depositBuyer.publicKey
        );
        const sellerBalanceBefore =
          await program.provider.connection.getBalance(depositSeller.publicKey);
        const depositBalanceBefore =
          await program.provider.connection.getBalance(depositPDA);

        const depositAmount = new BN(2000000000); // 2 SOL

        await depositPaymentToEscrow(
          depositBuyer,
          depositAmount,
          depositBuyerPDA,
          depositSellerPDA,
          depositEscrowPDA,
          depositAgreementPDA,
          depositPDA
        );

        // Get balances after deposit
        const buyerBalanceAfter = await program.provider.connection.getBalance(
          depositBuyer.publicKey
        );
        const sellerBalanceAfter = await program.provider.connection.getBalance(
          depositSeller.publicKey
        );
        const depositBalanceAfter =
          await program.provider.connection.getBalance(depositPDA);

        // Assert buyer balance decreased by deposit amount (plus rent exemption for deposit account)
        const rentExemption =
          await program.provider.connection.getMinimumBalanceForRentExemption(
            8 + 8 + 32 + 8 + 8 + 32 + 1 // Deposit account size
          );
        const expectedBuyerDecrease = depositAmount.toNumber() + rentExemption;
        const actualBuyerDecrease = buyerBalanceBefore - buyerBalanceAfter;
        const difference = Math.abs(
          actualBuyerDecrease - expectedBuyerDecrease
        );
        const maxAllowedDifference = 100000; // Allow up to 0.0001 SOL difference for transaction fees

        assert.ok(
          difference <= maxAllowedDifference,
          `Buyer balance should decrease by approximately ${expectedBuyerDecrease} lamports (actual: ${actualBuyerDecrease}, difference: ${difference})`
        );

        // Assert seller balance unchanged since deposit is made to the escrow account
        assert.equal(
          sellerBalanceBefore,
          sellerBalanceAfter,
          "Seller balance should remain unchanged"
        );

        // Assert deposit account balance increased by deposit amount plus rent exemption
        // (The rent exemption is included when the account is created with init)
        const expectedDepositIncrease =
          depositAmount.toNumber() + rentExemption;
        const actualDepositIncrease =
          depositBalanceAfter - depositBalanceBefore;
        const depositDifference = Math.abs(
          actualDepositIncrease - expectedDepositIncrease
        );
        const maxAllowedDepositDifference = 100000; // Allow up to 0.0001 SOL difference

        assert.ok(
          depositDifference <= maxAllowedDepositDifference,
          `Deposit account balance should increase by approximately ${expectedDepositIncrease} lamports (actual: ${actualDepositIncrease}, difference: ${depositDifference})`
        );

        // Verify the deposit account (associated with escrow) has the funds
        const updatedDeposit = await program.account.deposit.fetch(depositPDA);
        assert.equal(
          updatedDeposit.escrow.toString(),
          depositEscrowPDA.toString(),
          "Deposit should be associated with the escrow"
        );
        assert.equal(
          updatedDeposit.amount.toString(),
          depositAmount.toString(),
          "Deposit amount should match the deposited amount"
        );

        // Verify escrow's deposit account balance increased (this is the account where funds were deposited)
        assert.ok(
          depositDifference <= maxAllowedDepositDifference,
          `Escrow's deposit account balance should increase by approximately ${expectedDepositIncrease} lamports (actual: ${actualDepositIncrease}, difference: ${depositDifference})`
        );
      });
    });

    describe("authorize escrow", () => {
      // PDAs for authorize escrow tests
      let titleDeedPDA: PublicKey;
      let titleForSalePDA: PublicKey;
      let titleNumberLookupPDA: PublicKey;
      let agreementPDA: PublicKey;
      let agreementIndexPDA: PublicKey;
      let escrowPDA: PublicKey;
      let buyerPDA: PublicKey;
      let buyerIdNumberClaimPDA: PublicKey;
      let sellerPDA: PublicKey;
      let sellerIdNumberClaimPDA: PublicKey;
      let depositPDA: PublicKey;

      // Authorize escrow buyer and seller
      const buyer = anchor.web3.Keypair.generate();
      const seller = anchor.web3.Keypair.generate();

      // Authorize escrow seller and title details
      const sellerDetails = {
        idNumber: "555666777888",
        firstName: "Mike",
        lastName: "Oloo",
        phoneNumber: "555666777",
      };
      const titleDetails = {
        titleNumber: "999888777666",
        location: "Kisumu",
        acreage: 180,
        districtLandRegistry: "Kisumu",
        registryMapsheetNumber: new BN(111222333),
      };

      before(async () => {
        // airdrops
        await airdrop(buyer.publicKey, 3000000000); // 3 SOL for deposit
        await airdrop(seller.publicKey, 1000000000);

        // auth buyer details
        const buyerDetails = {
          idNumber: "666777888999",
          firstName: "Auth",
          lastName: "Buyer",
          phoneNumber: "666777888",
        };
        buyerPDA = getUserAddress(buyerDetails.idNumber, buyer.publicKey);
        buyerIdNumberClaimPDA = getIdNumberClaimPDA(buyerDetails.idNumber);

        // auth seller PDAs
        sellerPDA = getUserAddress(sellerDetails.idNumber, seller.publicKey);
        sellerIdNumberClaimPDA = getIdNumberClaimPDA(sellerDetails.idNumber);

        // Create auth buyer account
        await createUserAccount(
          buyer,
          buyerDetails.firstName,
          buyerDetails.lastName,
          buyerDetails.idNumber,
          buyerDetails.phoneNumber,
          buyerPDA,
          buyerIdNumberClaimPDA
        );

        // Create auth seller account
        await createUserAccount(
          seller,
          sellerDetails.firstName,
          sellerDetails.lastName,
          sellerDetails.idNumber,
          sellerDetails.phoneNumber,
          sellerPDA,
          sellerIdNumberClaimPDA
        );

        // Set up PDAs for auth title deed
        titleDeedPDA = getTitleDeedPDA(seller.publicKey);
        titleForSalePDA = getTitleForSalePDA(titleDeedPDA, seller.publicKey);
        titleNumberLookupPDA = getTitleNumberLookupPDA(
          titleDetails.titleNumber
        );

        // Assign title deed to auth seller
        await assignTitleDeedToOwner(
          registrar2,
          registrar2PDA,
          seller.publicKey,
          titleDetails.titleNumber,
          titleDetails.location,
          titleDetails.acreage,
          titleDetails.districtLandRegistry,
          titleDetails.registryMapsheetNumber,
          titleDeedPDA,
          sellerPDA
        );

        // Mark title deed for sale
        await markTitleForSale(
          seller,
          new BN(2000000000), // 2 SOL
          titleDeedPDA,
          sellerPDA,
          titleForSalePDA
        );

        // Buyer searches for title deed
        await searchTitleDeedByNumber(
          buyer,
          titleDetails.titleNumber,
          titleNumberLookupPDA,
          titleDeedPDA,
          buyerPDA
        );

        // Create agreement
        agreementPDA = getAgreementPDA(
          seller.publicKey,
          buyer.publicKey,
          titleDeedPDA,
          new BN(2000000000) // 2 SOL
        );
        agreementIndexPDA = getAgreementIndexPDA(titleDeedPDA);
        escrowPDA = getEscrowPDA(agreementPDA);
        depositPDA = getDepositPDA(escrowPDA);

        await makeAgreement(
          seller,
          new BN(2000000000),
          titleDeedPDA,
          titleForSalePDA,
          sellerPDA,
          buyerPDA,
          titleNumberLookupPDA,
          agreementPDA,
          agreementIndexPDA
        );

        // Buyer signs the agreement
        await signAgreement(
          buyer,
          new BN(2000000000),
          titleDeedPDA,
          agreementPDA
        );

        // Seller creates escrow
        await createEscrow(
          seller,
          titleDeedPDA,
          agreementPDA,
          sellerPDA,
          buyerPDA,
          escrowPDA
        );

        // Buyer deposits payment
        await depositPaymentToEscrow(
          buyer,
          new BN(2000000000),
          buyerPDA,
          sellerPDA,
          escrowPDA,
          agreementPDA,
          depositPDA
        );
      });

      it("allows registrar to authorize escrow transfer successfully", async () => {
        // Get balances before authorization
        const sellerBalanceBefore =
          await program.provider.connection.getBalance(seller.publicKey);
        const depositBalanceBefore =
          await program.provider.connection.getBalance(depositPDA);

        // Get title deed before authorization
        const titleDeedBefore = await program.account.titleDeed.fetch(
          titleDeedPDA
        );
        const sequenceNumber = titleDeedBefore.totalTransfers.toNumber();
        // Handler increments total_transfers first, so PDA uses incremented value
        const ownershipHistoryPDA = getOwnershipHistoryPDA(
          titleDeedPDA,
          sequenceNumber + 1
        );

        // Registrar authorizes the escrow
        await program.methods
          .authorizeEscrow()
          .accounts({
            authority: registrar2.publicKey,
            registrar: registrar2PDA,
            escrow: escrowPDA,
            deposit: depositPDA,
            titleDeed: titleDeedPDA,
            ownershipHistory: ownershipHistoryPDA,
            titleForSale: titleForSalePDA,
            agreement: agreementPDA,
            titleNumberLookup: titleNumberLookupPDA,
            buyer: buyerPDA,
            seller: sellerPDA,
            sellerAuthority: seller.publicKey, // Seller's wallet to receive funds
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([registrar2])
          .rpc();

        // Get balances after authorization
        const sellerBalanceAfter = await program.provider.connection.getBalance(
          seller.publicKey
        );
        const depositBalanceAfter =
          await program.provider.connection.getBalance(depositPDA);

        // Verify escrow state is Completed
        const escrow = await program.account.escrow.fetch(escrowPDA);
        // Anchor enums are objects - check if the 'completed' property exists
        assert.ok(
          "completed" in escrow.state,
          `Escrow should be completed, but state is: ${JSON.stringify(
            escrow.state
          )}`
        );
        assert.ok(
          escrow.completedAt !== null,
          "Escrow should have completion timestamp"
        );

        // Verify title deed ownership transferred to buyer
        const titleDeedAfter = await program.account.titleDeed.fetch(
          titleDeedPDA
        );
        assert.equal(
          titleDeedAfter.owner.authority.toString(),
          buyer.publicKey.toString(),
          "Title deed owner should be buyer"
        );
        assert.equal(
          titleDeedAfter.authority.toString(),
          buyer.publicKey.toString(),
          "Title deed authority should be buyer"
        );
        assert.equal(
          titleDeedAfter.isForSale,
          false,
          "Title deed should no longer be for sale"
        );

        // Verify total_transfers was incremented
        assert.equal(
          titleDeedAfter.totalTransfers.toNumber(),
          sequenceNumber + 1,
          "Total transfers should be incremented"
        );

        // Verify ownership history was recorded
        const ownershipHistory = await program.account.ownershipHistory.fetch(
          ownershipHistoryPDA
        );
        assert.equal(
          ownershipHistory.titleDeed.toString(),
          titleDeedPDA.toString(),
          "Ownership history should reference correct title deed"
        );
        assert.equal(
          ownershipHistory.previousOwner.toString(),
          seller.publicKey.toString(),
          "Previous owner should be seller"
        );
        assert.equal(
          ownershipHistory.currentOwner.toString(),
          buyer.publicKey.toString(),
          "Current owner should be buyer"
        );
        assert.equal(
          ownershipHistory.sequenceNumber.toNumber(),
          sequenceNumber + 1,
          "Sequence number should match incremented total_transfers"
        );
        assert.ok(
          "escrowCompletion" in ownershipHistory.transferType,
          "Transfer type should be EscrowCompletion"
        );

        // Verify seller received funds (deposit account should be closed/empty)
        const depositAmount = new BN(2000000000);
        const sellerBalanceIncrease = sellerBalanceAfter - sellerBalanceBefore;
        const maxAllowedDifference = 100000; // Allow for transaction fees

        assert.ok(
          Math.abs(sellerBalanceIncrease - depositAmount.toNumber()) <=
            maxAllowedDifference,
          `Seller should receive approximately ${depositAmount.toString()} lamports (actual increase: ${sellerBalanceIncrease})`
        );

        // Verify deposit account balance decreased (funds transferred to seller)
        assert.ok(
          depositBalanceAfter < depositBalanceBefore,
          "Deposit account balance should decrease after transfer"
        );
      });
    });
  });

  // helpers
  const airdrop = async (publicKey: anchor.web3.PublicKey, amount: number) => {
    const sig = await program.provider.connection.requestAirdrop(
      publicKey,
      amount
    );
    await program.provider.connection.confirmTransaction(sig, "confirmed");
  };

  // get PDA for the protocol
  const getProtocolAddress = (programID: PublicKey) => {
    return PublicKey.findProgramAddressSync(
      [anchor.utils.bytes.utf8.encode("protocol_state")],
      programID
    );
  };

  const getRegistrarPDA = (authority: PublicKey) => {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("registrar"), authority.toBuffer()],
      program.programId
    )[0];
  };

  const getUserAddress = (idNumber: string, authority: PublicKey) => {
    const utf8Bytes = Buffer.from(idNumber, "utf-8");
    const hash = crypto.createHash("sha256").update(utf8Bytes).digest();
    const idNumberSeed = new Uint8Array(hash);

    return PublicKey.findProgramAddressSync(
      [Buffer.from("person"), idNumberSeed, authority.toBuffer()],
      program.programId
    )[0];
  };

  const getIdNumberClaimPDA = (idNumber: string) => {
    const utf8Bytes = Buffer.from(idNumber, "utf-8");
    const hash = crypto.createHash("sha256").update(utf8Bytes).digest();
    const idNumberSeed = new Uint8Array(hash);

    return PublicKey.findProgramAddressSync(
      [Buffer.from("id_number_claim"), idNumberSeed],
      program.programId
    )[0];
  };

  const getTitleDeedPDA = (owner: PublicKey) => {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("title_deed"), owner.toBuffer()],
      program.programId
    )[0];
  };

  const getTitleForSalePDA = (titleDeed: PublicKey, seller: PublicKey) => {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("title_for_sale"), seller.toBuffer(), titleDeed.toBuffer()],
      program.programId
    )[0];
  };

  const getTitleNumberLookupPDA = (titleNumber: string) => {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("title_number_lookup"), Buffer.from(titleNumber)],
      program.programId
    )[0];
  };

  const getAgreementPDA = (
    seller: PublicKey,
    buyer: PublicKey,
    titleDeed: PublicKey,
    price: BN
  ) => {
    // price.to_le_bytes() in Rust returns 8 bytes in little-endian format
    const priceBuffer = Buffer.allocUnsafe(8);
    price.toArrayLike(Buffer, "le", 8).copy(priceBuffer);
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from("agreement"),
        seller.toBuffer(),
        buyer.toBuffer(),
        titleDeed.toBuffer(),
        priceBuffer,
      ],
      program.programId
    )[0];
  };

  const getAgreementIndexPDA = (titleDeed: PublicKey) => {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("agreement_index"), titleDeed.toBuffer()],
      program.programId
    )[0];
  };

  const getEscrowPDA = (agreement: PublicKey) => {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), agreement.toBuffer()],
      program.programId
    )[0];
  };

  const getDepositPDA = (escrow: PublicKey) => {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("deposit"), escrow.toBuffer()],
      program.programId
    )[0];
  };

  const getOwnershipHistoryPDA = (
    titleDeed: PublicKey,
    sequenceNumber: number
  ) => {
    const sequenceBuffer = Buffer.allocUnsafe(8);
    sequenceBuffer.writeBigUInt64LE(BigInt(sequenceNumber), 0);
    return PublicKey.findProgramAddressSync(
      [Buffer.from("ownership_history"), titleDeed.toBuffer(), sequenceBuffer],
      program.programId
    )[0];
  };

  // Instruction helper functions
  const createUserAccount = async (
    authority: anchor.web3.Keypair,
    firstName: string,
    lastName: string,
    idNumber: string,
    phoneNumber: string,
    userPDA: PublicKey,
    idNumberClaimPDA: PublicKey
  ) => {
    await program.methods
      .createUserAccount(firstName, lastName, idNumber, phoneNumber)
      .accounts({
        authority: authority.publicKey,
        user: userPDA,
        idNumberClaim: idNumberClaimPDA,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([authority])
      .rpc();
  };

  const assignTitleDeedToOwner = async (
    registrar: anchor.web3.Keypair,
    registrarPDA: PublicKey,
    newOwnerAddress: PublicKey,
    titleNumber: string,
    location: string,
    acreage: number,
    districtLandRegistry: string,
    registryMapsheetNumber: BN,
    titleDeedPDA: PublicKey,
    ownerPDA: PublicKey
  ) => {
    const ownershipHistoryPDA = getOwnershipHistoryPDA(titleDeedPDA, 0);
    await program.methods
      .assignTitleDeedToOwner(
        newOwnerAddress,
        titleNumber,
        location,
        acreage,
        districtLandRegistry,
        registryMapsheetNumber
      )
      .accounts({
        authority: registrar.publicKey,
        registrar: registrarPDA,
        titleDeed: titleDeedPDA,
        owner: ownerPDA,
        ownershipHistory: ownershipHistoryPDA,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([registrar])
      .rpc();
  };

  const markTitleForSale = async (
    authority: anchor.web3.Keypair,
    price: BN,
    titleDeedPDA: PublicKey,
    sellerPDA: PublicKey,
    titleForSalePDA: PublicKey
  ) => {
    await program.methods
      .markTitleForSale(price)
      .accounts({
        authority: authority.publicKey,
        titleDeed: titleDeedPDA,
        seller: sellerPDA,
        titleForSale: titleForSalePDA,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([authority])
      .rpc();
  };

  const searchTitleDeedByNumber = async (
    authority: anchor.web3.Keypair,
    titleNumber: string,
    titleNumberLookupPDA: PublicKey,
    titleDeedPDA: PublicKey,
    searchedByPDA: PublicKey
  ) => {
    await program.methods
      .searchTitleDeedByNumber(titleNumber)
      .accounts({
        authority: authority.publicKey,
        titleNumberLookup: titleNumberLookupPDA,
        titleDeed: titleDeedPDA,
        searchedBy: searchedByPDA,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([authority])
      .rpc();
  };

  const makeAgreement = async (
    authority: anchor.web3.Keypair,
    price: BN,
    titleDeedPDA: PublicKey,
    titleForSalePDA: PublicKey,
    sellerPDA: PublicKey,
    buyerPDA: PublicKey,
    titleNumberLookupPDA: PublicKey,
    agreementPDA: PublicKey,
    agreementIndexPDA: PublicKey
  ) => {
    await program.methods
      .makeAgreement(price)
      .accounts({
        authority: authority.publicKey,
        titleDeed: titleDeedPDA,
        titleForSale: titleForSalePDA,
        seller: sellerPDA,
        buyer: buyerPDA,
        titleNumberLookup: titleNumberLookupPDA,
        agreement: agreementPDA,
        agreementIndex: agreementIndexPDA,
      })
      .signers([authority])
      .rpc();
  };

  const signAgreement = async (
    authority: anchor.web3.Keypair,
    price: BN,
    titleDeedPDA: PublicKey,
    agreementPDA: PublicKey
  ) => {
    await program.methods
      .signAgreement(price)
      .accounts({
        authority: authority.publicKey,
        titleDeed: titleDeedPDA,
        agreement: agreementPDA,
      })
      .signers([authority])
      .rpc();
  };

  const createEscrow = async (
    authority: anchor.web3.Keypair,
    titleDeedPDA: PublicKey,
    agreementPDA: PublicKey,
    sellerPDA: PublicKey,
    buyerPDA: PublicKey,
    escrowPDA: PublicKey
  ) => {
    await program.methods
      .createEscrow()
      .accounts({
        authority: authority.publicKey,
        titleDeed: titleDeedPDA,
        agreement: agreementPDA,
        seller: sellerPDA,
        buyer: buyerPDA,
        escrow: escrowPDA,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([authority])
      .rpc();
  };

  const depositPaymentToEscrow = async (
    authority: anchor.web3.Keypair,
    amount: BN,
    buyerPDA: PublicKey,
    sellerPDA: PublicKey,
    escrowPDA: PublicKey,
    agreementPDA: PublicKey,
    depositPDA: PublicKey
  ) => {
    await program.methods
      .depositPaymentToEscrow(amount)
      .accounts({
        authority: authority.publicKey,
        buyer: buyerPDA,
        seller: sellerPDA,
        escrow: escrowPDA,
        agreement: agreementPDA,
        deposit: depositPDA,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([authority])
      .rpc();
  };
});
