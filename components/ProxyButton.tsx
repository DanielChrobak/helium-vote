import React, { useMemo } from "react";
import { SecondaryButton } from "./Button";
import { useWallet } from "@solana/wallet-adapter-react";
import { useHeliumVsrState } from "@helium/voter-stake-registry-hooks";
import { PublicKey } from "@solana/web3.js";

export const ProxyButton: React.FC<{
  className?: string;
  onClick: () => void;
  isLoading?: boolean;
}> = ({ className = "", onClick, isLoading = false }) => {
  const { connected } = useWallet();
  const { loading, positions } = useHeliumVsrState();

  const undelegatedPositions = useMemo(
    () =>
      positions?.filter(
        (p) =>
          !p.votingDelegation ||
          p.votingDelegation.nextOwner.equals(PublicKey.default)
      ),
    [positions]
  );

  const tooltipContent = !connected
    ? "Connect your wallet to claim"
    : !undelegatedPositions?.length
    ? "You don't have any positions available to proxy."
    : "";

  return (
    <SecondaryButton
      tooltipMessage={tooltipContent}
      className={className}
      disabled={!connected || loading || !undelegatedPositions?.length}
      isLoading={isLoading}
      onClick={onClick}
    >
      <div className="flex items-center">
        <span>Assign Voting Proxies</span>
      </div>
    </SecondaryButton>
  );
};
