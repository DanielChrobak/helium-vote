import * as anchor from "@coral-xyz/anchor";
import { init as initOrg } from "@helium/organization-sdk";
import { init as initProp } from "@helium/proposal-sdk";
import { init as initState, settings } from "@helium/state-controller-sdk";
import { registrarKey } from "@helium/voter-stake-registry-sdk";
import { Connection, PublicKey } from "@solana/web3.js";
import os from "os";
import yargs from "yargs";

export async function run(args: any = process.argv) {
  const yarg = yargs(args).options({
    wallet: {
      alias: "k",
      describe: "Anchor wallet keypair",
      default: `${os.homedir()}/.config/solana/id.json`,
    },
    url: {
      alias: "u",
      default: "http://127.0.0.1:8899",
      describe: "The solana url",
    },
    realmName: {
      type: "string",
      default: "Helium",
    },
    name: {
      type: "string",
    },
    mint: {
      type: "string",
    },
  });
  const argv = await yarg.argv;
  process.env.ANCHOR_WALLET = argv.wallet;
  process.env.ANCHOR_PROVIDER_URL = argv.url;
  anchor.setProvider(anchor.AnchorProvider.local(argv.url));

  const registrarK = registrarKey(
    PublicKey.findProgramAddressSync(
      [
        Buffer.from("governance", "utf-8"),
        Buffer.from(argv.realmName, "utf-8"),
      ],
      new PublicKey("hgovkRU6Ghe1Qoyb54HdSLdqN7VtxaifBzRmh9jtd3S")
    )[0],
    new PublicKey(argv.mint)
  )[0];
  const provider = anchor.getProvider() as anchor.AnchorProvider;
  const orgProgram = await initOrg(provider);
  const proposalProgram = await initProp(provider);
  const stateProgram = await initState(provider);

  const nodes = settings()
    .and(
      settings().and(
        settings().top(1),
        settings().choiceVoteWeight(new anchor.BN(1000))
      ),
      settings().offsetFromStartTs(new anchor.BN(60 * 60 * 24 * 7))
    )
    .build();

  const initResolutionSettings =
    stateProgram.methods.initializeResolutionSettingsV0({
      name: `${argv.name} Single Choice V1`,
      settings: {
        nodes,
      },
    });

  const resolutionSettings = (await initResolutionSettings.pubkeys())
    .resolutionSettings!;
  if (!(await exists(provider.connection, resolutionSettings))) {
    console.log("Creating resolution settings");
    await initResolutionSettings.rpc({ skipPreflight: true });
  }

  const voteController = registrarK;
  const initProposalConfig = proposalProgram.methods.initializeProposalConfigV0(
    {
      name: `${argv.name} Default V1`,
      voteController,
      stateController: resolutionSettings!,
      onVoteHook: stateProgram.programId,
    }
  );
  const proposalConfig = (await initProposalConfig.pubkeys()).proposalConfig!;
  if (!(await exists(provider.connection, proposalConfig))) {
    console.log("Creating proposal config");
    await initProposalConfig.rpc({ skipPreflight: true });
  }

  const initOrganization = orgProgram.methods.initializeOrganizationV0({
    name: argv.name,
    defaultProposalConfig: proposalConfig,
    authority: provider.wallet.publicKey,
    proposalProgram: proposalProgram.programId,
    uri: "https://helium.com",
  });
  const organization = (await initOrganization.pubkeys()).organization;
  if (!(await exists(provider.connection, organization))) {
    console.log("Creating organization");
    await initOrganization.rpc({ skipPreflight: true });
    console.log(`Created org ${organization.toBase58()}`);
  } else {
    await orgProgram.methods
      .updateOrganizationV0({
        defaultProposalConfig: proposalConfig,
        proposalProgram: null,
        uri: null,
        authority: new PublicKey("devXCnFPU71StPEFNnGRf4iqXoRpYkNsGEg9m757ktP"),
      })
      .accounts({ organization })
      .rpc({ skipPreflight: true });
  }
}

async function exists(connection: Connection, pkey: PublicKey) {
  return !!(await connection.getAccountInfo(pkey));
}
