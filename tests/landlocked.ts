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
  let title2DeedPDA: PublicKey;
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

    title2DeedPDA = getTitleDeedPDA(owner2.publicKey);
    title2NumberLookupPDA = getTitleNumberLookupPDA(owner2Details.titleNumber);

    // assign title deed to owner2
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
        titleDeed: title2DeedPDA,
        owner: owner2PDA,
        titleNumberLookup: title2NumberLookupPDA,
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
    let titleDeedPDA: PublicKey;
    let titleNumberLookupPDA: PublicKey;
    before(async () => {
      titleDeedPDA = getTitleDeedPDA(owner1.publicKey);
      titleNumberLookupPDA = getTitleNumberLookupPDA(owner1Details.titleNumber);
      await program.methods
        .assignTitleDeedToOwner(
          owner1.publicKey,
          owner1Details.titleNumber,
          owner1Details.location,
          owner1Details.acreage,
          owner1Details.districtLandRegistry,
          owner1Details.registryMapsheetNumber
        )
        .accounts({
          authority: registrar2.publicKey,
          registrar: registrar2PDA,
          titleDeed: titleDeedPDA,
          owner: owner1PDA,
          titleNumberLookup: titleNumberLookupPDA,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([registrar2])
        .rpc();
    });

    it("allows a registrar to assign a title deed to a owner", async () => {
      const titleDeed = await program.account.titleDeed.fetch(titleDeedPDA);
      assert.equal(titleDeed.authority.toString(), owner1.publicKey.toString());
      assert.equal(
        titleDeed.owner.authority.toString(),
        owner1.publicKey.toString()
      );
      assert.equal(titleDeed.isForSale, false);
    });

    it("can allow owner to mark title deed for sale", async () => {
      const titleForSalePDA = getTitleForSalePDA(
        titleDeedPDA,
        owner1.publicKey
      );

      await program.methods
        .markTitleForSale(new BN(1000000000))
        .accounts({
          authority: owner1.publicKey, // owner
          titleDeed: titleDeedPDA,
          seller: owner1PDA,
          titleForSale: titleForSalePDA,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([owner1])
        .rpc();

      const titleForSale = await program.account.titleForSale.fetch(
        titleForSalePDA
      );
      assert.equal(titleForSale.titleDeed.toString(), titleDeedPDA.toString());
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
      // owner1 is interested in buying land from owner2(with title2 of number 342343243)
      await program.methods
        .searchTitleDeedByNumber(owner2Details.titleNumber)
        .accounts({
          authority: owner1.publicKey,
          titleNumberLookup: title2NumberLookupPDA,
          titleDeed: title2DeedPDA,
          searchedBy: owner1PDA,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([owner1])
        .rpc();

      // fetch the title deed details
      const titleDeed = await program.account.titleDeed.fetch(title2DeedPDA);
      // confirm if owner2 is the rightful owner of the title deed
      assert.equal(titleDeed.authority.toString(), owner2.publicKey.toString());
      assert.equal(
        titleDeed.owner.authority.toString(),
        owner2.publicKey.toString()
      );
      assert.equal(titleDeed.isForSale, false);
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
});
