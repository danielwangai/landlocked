import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import * as assert from "assert";
import { Landlocked } from "../target/types/landlocked";

describe("landlocked", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.landlocked as Program<Landlocked>;

  // Protocol admins
  const admin1 = anchor.web3.Keypair.generate();
  const admin2 = anchor.web3.Keypair.generate();
  const registrar1 = anchor.web3.Keypair.generate();
  const fakeAdmin = anchor.web3.Keypair.generate();
  let protocolState: PublicKey;

  // PDA accounts
  let admin1PDA: PublicKey;
  let admin2PDA: PublicKey;
  let registrar1PDA: PublicKey;
  let fakeAdminPDA: PublicKey;

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

  // registrar1 PDA
  [registrar1PDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("registrar"), registrar1.publicKey.toBuffer()],
    program.programId
  );

  before(async () => {
    // airdrop SOL to the admins
    await airdrop(admin1.publicKey, 1_000_000_000);
    await airdrop(admin2.publicKey, 1_000_000_000);
    await airdrop(fakeAdmin.publicKey, 1_000_000_000);
    await airdrop(registrar1.publicKey, 1_000_000_000);
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
    const registrar1FirstName = "John";
    const registrar1LastName = "Doe";
    const registrar1IdNumber = "1234567890";
    before(async () => {
      await program.methods
        .addRegistrar(
          registrar1.publicKey,
          registrar1FirstName,
          registrar1LastName,
          registrar1IdNumber
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
      assert.equal(registrar.firstName, registrar1FirstName);
      assert.equal(registrar.lastName, registrar1LastName);
      assert.equal(registrar.idNumber, registrar1IdNumber);
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
});
