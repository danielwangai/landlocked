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
  let protocolState: PublicKey;

  // protocol state PDA
  [protocolState] = PublicKey.findProgramAddressSync(
    [Buffer.from("protocol_state")],
    program.programId
  );


  beforeEach(async () => {
    // airdrop SOL to the admins
    await airdrop(admin1.publicKey, 1_000_000_000);
    await airdrop(admin2.publicKey, 1_000_000_000);

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
