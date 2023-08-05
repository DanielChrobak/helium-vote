import React from "react";
import { BN } from "@coral-xyz/anchor";
import { BsFillLightningChargeFill } from "react-icons/bs";
import Tooltip from "./Tooltip";
import { FiSettings } from "react-icons/fi";
import { humanReadable } from "@helium/spl-utils";
import { useMint } from "@helium/helium-react-hooks";
import { PublicKey } from "@solana/web3.js";
import { useHeliumVsrState } from "@helium/voter-stake-registry-hooks";
import Link from "next/link";

interface VotingPowerBoxProps {
  votingPower?: BN;
  mint: PublicKey;
  amountLocked?: BN;
  className?: string;
  style?: any;
}

export const VotingPowerBox: React.FC<VotingPowerBoxProps> = ({
  votingPower,
  mint,
  amountLocked,
  className = "",
  style,
}) => {
  const { info: mintAcc } = useMint(mint);
  return (
    <>
      <div
        className={`bg-bkg-1 flex justify-between items-center rounded-md ${className}`}
        style={style}
      >
        <div>
          <Link
            href="/staking"
            className="block py-2 pl-3 pr-4 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:border-0 md:hover:text-blue-700 md:p-0 dark:text-white md:dark:hover:text-blue-500 dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent"
          >
            <div className="flex flex-row items-center space-x-2">
              <span className="text-xl font-bold">Voting Power</span>
              <FiSettings />
            </div>
          </Link>

          <span className="mb-0 flex font-bold items-center hero-text">
            {mintAcc && votingPower && humanReadable(votingPower, mintAcc)}{" "}
            {amountLocked &&
              votingPower &&
              !amountLocked.isZero() &&
              !votingPower.isZero() && (
                <Tooltip content="Vote Weight Multiplier – Increase your vote weight by locking tokens">
                  <div className="cursor-help flex font-normal items-center text-xs ml-3 rounded-full bg-bkg-3 px-2 py-1">
                    <BsFillLightningChargeFill className="h-3 mr-1 text-primary-light w-3" />
                    {`${
                      votingPower &&
                      amountLocked &&
                      mintAcc &&
                      humanReadable(votingPower.div(amountLocked), 0)
                    }x`}
                  </div>
                </Tooltip>
              )}
          </span>
        </div>
      </div>
    </>
  );
};

export const ProvidedVotingPowerBox: React.FC<{
  className?: string;
  style?: any;
}> = ({ className, style }) => {
  const { amountLocked, mint, votingPower } = useHeliumVsrState();
  return (
    <VotingPowerBox
      className={className}
      style={style}
      amountLocked={amountLocked}
      mint={mint}
      votingPower={votingPower}
    />
  );
};
