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
  const fakeAdmin = anchor.web3.Keypair.generate();
  let protocolState: PublicKey;

  // PDA accounts
  let admin1PDA: PublicKey;
  let admin2PDA: PublicKey;
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

  before(async () => {
    // airdrop SOL to the admins
    await airdrop(admin1.publicKey, 1_000_000_000);
    await airdrop(admin2.publicKey, 1_000_000_000);
    await airdrop(fakeAdmin.publicKey, 1_000_000_000);
    // initialize the protocol
    await program.methods.initialize([admin1.publicKey, admin2.publicKey]).accounts({
      payer: admin1.publicKey,
      protocolState,
      systemProgram: anchor.web3.SystemProgram.programId,
    }).signers([admin1])
    .rpc();
  });

  it("Protocol is initialized!", async () => {
    // fetch the protocol
    const protocol = await program.account.protocolState.fetch(protocolState);
    assert.equal(protocol.admins.length, 2);
    assert.equal(protocol.admins[0].toString(), admin1.publicKey.toString());
    assert.equal(protocol.admins[1].toString(), admin2.publicKey.toString());
    assert.equal(protocol.isPaused, false);
  });

  it("confirms admin account successfully", async () => {
    await program.methods.confirmAdminAccount().accounts({
      authority: admin1.publicKey,
      admin: admin1PDA,
      protocolState,
      systemProgram: anchor.web3.SystemProgram.programId,
    }).signers([admin1])
    .rpc();

    // fetch the admin
    const admin = await program.account.admin.fetch(admin1PDA);
    assert.equal(admin.authority.toString(), admin1.publicKey.toString());
  });

  it("cannot confirm admin account if not an admin", async () => {
    try {
      await program.methods.confirmAdminAccount().accounts({
        authority: fakeAdmin.publicKey,
        admin: fakeAdminPDA,
        protocolState,
        systemProgram: anchor.web3.SystemProgram.programId,
      }).signers([fakeAdmin])
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
      await program.methods.confirmAdminAccount().accounts({
        authority: admin1.publicKey,
        admin: admin2PDA,
        protocolState,
        systemProgram: anchor.web3.SystemProgram.programId,
      }).signers([admin1])
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

  // helpers
  const airdrop = async (publicKey: anchor.web3.PublicKey, amount: number) => {
    const sig = await program.provider.connection.requestAirdrop(
      publicKey,
      amount,
    );
    await program.provider.connection.confirmTransaction(sig, "confirmed");
  };

  // get PDA for the protocol
  const getProtocolAddress = (
    programID: PublicKey,
  ) => {
    return PublicKey.findProgramAddressSync(
      [
        anchor.utils.bytes.utf8.encode("protocol_state"),
      ],
      programID,
    );
  };
});
